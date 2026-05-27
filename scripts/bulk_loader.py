"""
Carga masiva de candidatos - Version definitiva V7

Compatible con el contrato actual de la API:
- POST /api/candidatos requiere dni, nombres_completos y partido
- Soporta url_hoja_vida opcional

Incluye:
- Checkpoint persistente en JSON
- Reintentos selectivos con backoff exponencial
- Validacion de payload del candidato
- Carga respetando rate limits (1.5s por candidato)
- Reanudacion desde checkpoint sin depender de la lista original
- API base URL configurable por variable de entorno
"""

import asyncio
import json
import os
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp
from tenacity import (
    AsyncRetrying,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)


ERRORES_REINTENTABLES = {429, 502, 503, 504}
CHECKPOINT_FILE = "checkpoint_carga.json"
MAX_REINTENTOS = 3
PAUSA_ENTRE_LOTES = 1.5
BATCH_SIZE = 1
TIMEOUT_SEGUNDOS = 30
DEFAULT_API_BASE_URL = "http://localhost:8001"


class ErrorReintentable(Exception):
    """Error temporal que merece reintento."""


def validar_dni(dni: str) -> bool:
    """Validacion simple de DNI peruano."""
    return bool(dni and len(dni) == 8 and dni.isdigit())


def normalizar_texto(valor: Optional[str]) -> str:
    """Limpia valores de texto del payload."""
    return (valor or "").strip()


def normalizar_candidato(candidato: Dict) -> Dict:
    """Normaliza el payload del candidato para alinearlo con la API."""
    return {
        "dni": normalizar_texto(candidato.get("dni")),
        "nombres_completos": normalizar_texto(candidato.get("nombres_completos")),
        "partido": normalizar_texto(candidato.get("partido")),
        "cargo_postula": normalizar_texto(candidato.get("cargo_postula")) or "senador",
        "url_hoja_vida": normalizar_texto(candidato.get("url_hoja_vida")),
    }


def validar_candidato(candidato: Dict) -> Optional[str]:
    """Valida el payload minimo requerido por la API."""
    dni = candidato.get("dni", "")
    if not validar_dni(dni):
        return "DNI invalido"

    if not normalizar_texto(candidato.get("nombres_completos")):
        return "Falta nombres_completos"

    if not normalizar_texto(candidato.get("partido")):
        return "Falta partido"

    return None


def es_error_reintentable(status: Optional[int], detalle: str = "") -> bool:
    """Determina si un error merece reintento."""
    if status in ERRORES_REINTENTABLES:
        return True

    detalle_normalizado = (detalle or "").lower()
    indicadores = [
        "timeout",
        "connection reset",
        "server disconnected",
        "temporarily unavailable",
        "connection aborted",
        "too many requests",
    ]
    return any(texto in detalle_normalizado for texto in indicadores)


class BulkCandidatoLoaderV6:
    def __init__(
        self,
        api_base_url: Optional[str] = None,
        checkpoint_file: str = CHECKPOINT_FILE,
    ):
        self.api_base_url = (
            api_base_url
            or os.getenv("API_BASE_URL")
            or DEFAULT_API_BASE_URL
        ).rstrip("/")
        self.checkpoint_path = Path(checkpoint_file)

        self.resultados = {
            "exitosos": set(),
            "pendientes": {},
            "errores": [],
            "invalidos": [],
            "ultimo_lote": 0,
            "timestamp_inicio": None,
            "timestamp_fin": None,
        }

        self._cargar_checkpoint()

    # ============================================================
    # CHECKPOINT
    # ============================================================

    def _cargar_checkpoint(self) -> None:
        """Recupera estado anterior si existe."""
        if not self.checkpoint_path.exists():
            return

        try:
            data = json.loads(self.checkpoint_path.read_text(encoding="utf-8"))
            self.resultados["exitosos"] = set(data.get("exitosos", []))
            self.resultados["pendientes"] = self._cargar_pendientes_checkpoint(
                data.get("pendientes", [])
            )
            self.resultados["errores"] = data.get("errores", [])
            self.resultados["invalidos"] = data.get("invalidos", [])
            self.resultados["ultimo_lote"] = data.get("ultimo_lote", 0)

            print(
                f"Checkpoint cargado: "
                f"{len(self.resultados['exitosos'])} exitosos, "
                f"{len(self.resultados['pendientes'])} pendientes"
            )
        except Exception as exc:
            print(f"Error cargando checkpoint: {exc}")

    def _cargar_pendientes_checkpoint(self, pendientes_data) -> Dict[str, Dict]:
        """Convierte checkpoints viejos o nuevos al formato interno actual."""
        pendientes = {}

        if isinstance(pendientes_data, dict):
            for dni, payload in pendientes_data.items():
                if isinstance(payload, dict):
                    candidato = normalizar_candidato(payload)
                    if candidato["dni"]:
                        pendientes[candidato["dni"]] = candidato
                elif validar_dni(str(dni)):
                    pendientes[str(dni)] = {
                        "dni": str(dni),
                        "nombres_completos": "",
                        "partido": "",
                        "cargo_postula": "senador",
                    }
            return pendientes

        if isinstance(pendientes_data, list):
            for item in pendientes_data:
                if isinstance(item, dict):
                    candidato = normalizar_candidato(item)
                    if candidato["dni"]:
                        pendientes[candidato["dni"]] = candidato
                elif isinstance(item, str) and validar_dni(item):
                    pendientes[item] = {
                        "dni": item,
                        "nombres_completos": "",
                        "partido": "",
                        "cargo_postula": "senador",
                    }

        return pendientes

    def _guardar_checkpoint(self) -> None:
        """Guarda progreso actual."""
        payload = {
            "exitosos": sorted(self.resultados["exitosos"]),
            "pendientes": sorted(
                self.resultados["pendientes"].values(),
                key=lambda item: item["dni"],
            ),
            "errores": self.resultados["errores"],
            "invalidos": self.resultados["invalidos"],
            "ultimo_lote": self.resultados["ultimo_lote"],
            "timestamp": datetime.now().isoformat(),
        }

        try:
            self.checkpoint_path.write_text(
                json.dumps(payload, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        except Exception as exc:
            print(f"Error guardando checkpoint: {exc}")

    # ============================================================
    # HTTP + REINTENTOS
    # ============================================================

    async def _post_candidato(
        self,
        session: aiohttp.ClientSession,
        candidato: Dict,
    ) -> Dict:
        """Hace un intento individual al endpoint."""
        url = f"{self.api_base_url}/api/candidatos"

        try:
            async with session.post(url, json=candidato) as response:
                text = await response.text()

                if 200 <= response.status < 300:
                    return {
                        "dni": candidato["dni"],
                        "ok": True,
                        "status": response.status,
                        "detalle": None,
                        "payload": candidato,
                    }

                if es_error_reintentable(response.status, text):
                    raise ErrorReintentable(f"HTTP {response.status}: {text[:200]}")

                return {
                    "dni": candidato["dni"],
                    "ok": False,
                    "status": response.status,
                    "detalle": text[:200],
                    "payload": candidato,
                }

        except asyncio.TimeoutError as exc:
            raise ErrorReintentable("timeout") from exc
        except aiohttp.ClientError as exc:
            if es_error_reintentable(None, str(exc)):
                raise ErrorReintentable(str(exc)) from exc

            return {
                "dni": candidato["dni"],
                "ok": False,
                "status": None,
                "detalle": str(exc),
                "payload": candidato,
            }

    async def _cargar_con_reintentos(
        self,
        session: aiohttp.ClientSession,
        candidato: Dict,
    ) -> Dict:
        """Reintenta solo errores transitorios."""
        try:
            async for intento in AsyncRetrying(
                stop=stop_after_attempt(MAX_REINTENTOS),
                wait=wait_exponential(multiplier=1, min=1, max=8),
                retry=retry_if_exception_type(ErrorReintentable),
                reraise=True,
            ):
                with intento:
                    return await self._post_candidato(session, candidato)
        except ErrorReintentable as exc:
            return {
                "dni": candidato["dni"],
                "ok": False,
                "status": None,
                "detalle": f"Error reintentable agotado: {exc}",
                "tipo": "reintentable_agotado",
                "payload": candidato,
            }

    async def _procesar_candidato(
        self,
        session: aiohttp.ClientSession,
        candidato: Dict,
    ) -> Dict:
        """Valida y procesa un candidato individual."""
        candidato_normalizado = normalizar_candidato(candidato)
        error_validacion = validar_candidato(candidato_normalizado)

        if error_validacion:
            return {
                "dni": candidato_normalizado.get("dni", ""),
                "ok": False,
                "status": None,
                "detalle": error_validacion,
                "tipo": "invalido",
                "payload": candidato_normalizado,
            }

        resultado = await self._cargar_con_reintentos(session, candidato_normalizado)
        if resultado["ok"]:
            resultado["tipo"] = "ok"
        else:
            resultado.setdefault("tipo", "error")

        return resultado

    # ============================================================
    # PROCESAMIENTO
    # ============================================================

    async def _procesar_lista_candidatos(
        self,
        candidatos: List[Dict],
        reiniciar_contador_lotes: bool = False,
    ) -> None:
        """Procesa una lista de candidatos en lotes."""
        if not candidatos:
            print("No hay candidatos para procesar")
            return

        self.resultados["timestamp_inicio"] = datetime.now()

        timeout = aiohttp.ClientTimeout(total=TIMEOUT_SEGUNDOS)
        total_lotes = (len(candidatos) + BATCH_SIZE - 1) // BATCH_SIZE
        lote_base = 0 if reiniciar_contador_lotes else self.resultados["ultimo_lote"]

        async with aiohttp.ClientSession(timeout=timeout) as session:
            for indice in range(0, len(candidatos), BATCH_SIZE):
                batch = candidatos[indice : indice + BATCH_SIZE]
                numero_lote = lote_base + (indice // BATCH_SIZE) + 1

                tareas = [self._procesar_candidato(session, item) for item in batch]
                resultados = await asyncio.gather(*tareas)

                exitos_lote = 0
                errores_lote = 0

                for resultado in resultados:
                    dni = resultado["dni"]
                    payload = resultado["payload"]

                    if resultado["ok"]:
                        self.resultados["exitosos"].add(dni)
                        self.resultados["pendientes"].pop(dni, None)
                        exitos_lote += 1
                        continue

                    errores_lote += 1

                    if resultado["tipo"] == "invalido":
                        if not any(
                            item["dni"] == dni and item["detalle"] == resultado["detalle"]
                            for item in self.resultados["invalidos"]
                        ):
                            self.resultados["invalidos"].append(
                                {
                                    "dni": dni,
                                    "detalle": resultado["detalle"],
                                    "payload": payload,
                                }
                            )
                        self.resultados["pendientes"].pop(dni, None)
                    else:
                        self.resultados["pendientes"][dni] = payload

                        ya_registrado = any(
                            item["dni"] == dni
                            and item.get("detalle") == resultado.get("detalle", "")
                            for item in self.resultados["errores"]
                        )
                        if not ya_registrado:
                            self.resultados["errores"].append(
                                {
                                    "dni": dni,
                                    "status": resultado.get("status"),
                                    "detalle": resultado.get("detalle", ""),
                                    "tipo": resultado.get("tipo", "error"),
                                    "payload": payload,
                                }
                            )

                self.resultados["ultimo_lote"] = numero_lote
                self._guardar_checkpoint()

                print(
                    f"Lote {numero_lote}/{lote_base + total_lotes} | "
                    f"OK: {exitos_lote} | "
                    f"Error: {errores_lote} | "
                    f"Acumulado OK: {len(self.resultados['exitosos'])} | "
                    f"Pendientes: {len(self.resultados['pendientes'])}"
                )

                if indice + BATCH_SIZE < len(candidatos):
                    await asyncio.sleep(PAUSA_ENTRE_LOTES)

        self.resultados["timestamp_fin"] = datetime.now()
        self._guardar_checkpoint()
        self._reporte_final()

    async def cargar_lote(self, candidatos: List[Dict]) -> None:
        """Carga una lista nueva evitando reprocesar candidatos exitosos."""
        candidatos_normalizados = [
            normalizar_candidato(item) for item in candidatos if isinstance(item, dict)
        ]
        candidatos_a_procesar = [
            item
            for item in candidatos_normalizados
            if item["dni"] not in self.resultados["exitosos"]
        ]

        if not candidatos_a_procesar:
            print("Todos los candidatos ya fueron procesados exitosamente")
            return

        print(f"Candidatos recibidos: {len(candidatos_normalizados)}")
        print(f"Candidatos a procesar: {len(candidatos_a_procesar)}")

        await self._procesar_lista_candidatos(candidatos_a_procesar)

    async def reanudar_desde_checkpoint(self) -> None:
        """Reanuda usando solo los candidatos pendientes guardados."""
        pendientes = sorted(
            self.resultados["pendientes"].values(),
            key=lambda item: item["dni"],
        )

        if not pendientes:
            print("No hay candidatos pendientes en el checkpoint")
            return

        pendientes_validos = [
            item
            for item in pendientes
            if normalizar_texto(item.get("nombres_completos"))
            and normalizar_texto(item.get("partido"))
        ]

        if not pendientes_validos:
            print(
                "El checkpoint contiene pendientes antiguos sin payload completo. "
                "Necesitas volver a cargar la lista fuente con nombres y partido."
            )
            return

        print(
            f"Reanudando desde checkpoint con {len(pendientes_validos)} "
            f"candidatos pendientes"
        )
        await self._procesar_lista_candidatos(
            pendientes_validos,
            reiniciar_contador_lotes=True,
        )

    # ============================================================
    # REPORTE
    # ============================================================

    def _reporte_final(self) -> None:
        inicio = self.resultados["timestamp_inicio"]
        fin = self.resultados["timestamp_fin"]
        tiempo_min = 0.0

        if inicio and fin:
            tiempo_min = (fin - inicio).total_seconds() / 60

        print("\n" + "=" * 60)
        print("REPORTE FINAL DE CARGA MASIVA")
        print("=" * 60)
        print(f"API base URL: {self.api_base_url}")
        print(f"Exitosos: {len(self.resultados['exitosos'])}")
        print(f"Pendientes: {len(self.resultados['pendientes'])}")
        print(f"Invalidos: {len(self.resultados['invalidos'])}")
        print(f"Errores registrados: {len(self.resultados['errores'])}")
        print(f"Tiempo total: {tiempo_min:.2f} minutos")
        print("=" * 60)

        if self.resultados["pendientes"]:
            print("\nPendientes para futura ejecucion:")
            for candidato in sorted(
                self.resultados["pendientes"].values(),
                key=lambda item: item["dni"],
            )[:10]:
                print(
                    f"- {candidato['dni']} | "
                    f"{candidato.get('nombres_completos', '')} | "
                    f"{candidato.get('partido', '')}"
                )

        if self.resultados["invalidos"]:
            print("\nCandidatos invalidos detectados:")
            for item in self.resultados["invalidos"][:5]:
                print(f"- {item['dni']}: {item['detalle']}")

        if self.resultados["errores"]:
            print("\nErrores relevantes:")
            for err in self.resultados["errores"][:5]:
                print(
                    f"- DNI {err['dni']} | "
                    f"status={err.get('status')} | "
                    f"tipo={err.get('tipo')} | "
                    f"detalle={err.get('detalle', '')[:100]}"
                )
