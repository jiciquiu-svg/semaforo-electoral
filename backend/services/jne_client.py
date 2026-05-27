import httpx
import logging
import re
import os
from bs4 import BeautifulSoup
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type
from typing import Dict, Optional, Any

# Configuración de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("JNEClient")

from dotenv import load_dotenv
load_dotenv("backend/.env")

class JNEClient:
    """
    Cliente robusto para interactuar con la plataforma del JNE (Jurado Nacional de Elecciones).
    Utiliza las API JSON oficiales para obtener datos enriquecidos.
    """

    def __init__(self, session_token=None):
        self.api_base = "https://web.jne.gob.pe/serviciovotoinformado/api/hojavidavoto"
        self.photo_base = "https://mpesije.jne.gob.pe/apidocs/"
        
        # Priorizar token pasado, fallback a varaible de entorno
        token = session_token or os.getenv("JNE_SESSION_TOKEN")
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            "Accept": "application/json",
            "x-session-token": str(token or ""),
            "Origin": "https://votoinformado.jne.gob.pe",
            "Referer": "https://votoinformado.jne.gob.pe/",
            "Cookie": str(os.getenv("JNE_COOKIES", ""))
        }

    def set_token(self, token: str):
        self.headers["x-session-token"] = token

    async def _refresh_token(self):
        """Obtiene un nuevo token de sesión desde la API de JNE."""
        logger.info("Solicitando nuevo token de sesión...")
        api_token_url = "https://web.jne.gob.pe/serviciovotoinformado/api/authentication/token"
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                headers = {
                    "User-Agent": self.headers["User-Agent"],
                    "Referer": self.headers["Referer"],
                    "Origin": self.headers["Origin"]
                }
                response = await client.get(api_token_url, headers=headers)
                response.raise_for_status()
                data = response.json()
                new_token = data.get("token")
                if new_token:
                    logger.info(f"Nuevo token obtenido: {new_token}")
                    self.headers["x-session-token"] = new_token
                    return new_token
            except Exception as e:
                logger.error(f"Error al refrescar token: {e}")
        return None

    @retry(
        stop=stop_after_attempt(5),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        retry=retry_if_exception_type(httpx.HTTPStatusError),
        reraise=True
    )
    async def _api_get(self, endpoint: str, params: Dict[str, Any]) -> Any:
        """Realiza una petición GET a la API JSON."""
        async with httpx.AsyncClient(timeout=15.0, headers=self.headers) as client:
            try:
                logger.info(f"Enviando headers: {self.headers}")
                response = await client.get(f"{self.api_base}/{endpoint}", params=params)
                response.raise_for_status()
                return response.json()
            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:
                    logger.warning(f"429 para {endpoint}. Reintentando...")
                elif e.response.status_code == 401:
                    logger.warning(f"401 detectado para {endpoint}. Intentando refrescar token...")
                    if await self._refresh_token():
                        # Reintentar la llamada recursivamente una vez con el nuevo token
                        # Nota: tenement retry decorador arriba, pero el 401 lo manejamos aquí
                        async with httpx.AsyncClient(timeout=15.0, headers=self.headers) as new_client:
                            response = await new_client.get(f"{self.api_base}/{endpoint}", params=params)
                            response.raise_for_status()
                            return response.json()
                raise e
            except Exception as e:
                logger.error(f"Error en API {endpoint}: {str(e)}")
                return None

    async def enriquecer_candidato(self, dni: str, url_hoja_vida: str) -> Dict[str, Any]:
        """
        Orquestador para descargar datos mediante APIs JSON.
        url_hoja_vida debe contener el idHojaVida al final.
        """
        # Extraer idHojaVida de la URL (ej: /245741)
        match_id = re.search(r"/(\d+)$", url_hoja_vida)
        if not match_id:
            logger.error(f"No se pudo extraer idHojaVida de {url_hoja_vida}")
            return {}
            
        id_hv = match_id.group(1)
        logger.info(f"Enriqueciendo candidato DNI {dni} (ID HV: {id_hv})")
        
        data = {
            "foto_url": None,
            "tiene_sentencias": False,
            "tipo_sentencia": None,
            "ingresos_total": 0.0,
            "detalle_sentencias": "",
            "formacion": [],
            "experiencia": [],
            "ingresos_detalle": []
        }

        # 1. Foto y Datos Principales
        principal = await self._api_get("hojavida-principal", {"IdHojaVida": id_hv})
        if principal:
            # La API a veces anida los datos en 'datoGeneral'
            dg = principal.get("datoGeneral") if isinstance(principal.get("datoGeneral"), dict) else principal
            
            uuid_foto = dg.get("txNombreArchivo")
            if uuid_foto:
                if not uuid_foto.endswith(".jpg"):
                    uuid_foto += ".jpg"
                data["foto_url"] = f"{self.photo_base}{uuid_foto}"
            
            # También podemos extraer ingresos desde aquí si están disponibles
            if dg.get("decIngreso"):
                data["ingresos_total"] = float(dg.get("decIngreso", 0.0))

        # 2. Formación Académica (Consolidada)
        edu_endpoints = [
            ("estudiosUniversitarios", "UNIVERSITARIA", "educacionUniversitaria", "universidad", "carreraUni", "grado", "anioBachiller"),
            ("educaciontecnica", "TECNICA", "educacionTecnica", "centroEstudioTecnico", "carreraTecnico", "concluidoEduTecnico", "anioBachiller"),
            ("Posgradovoto", "POSTGRADO", "posgrado", "centroEstudioPosgrado", "especialidadPosgrado", "gradoPosgrado", "anioPosgrado"),
            ("educacionbasica", "BASICA", "educacionBasica", "centroEstudioBasica", "carreraBasica", "concluidoEduBasica", "anioBasica"),
            ("estnouniversitarios", "NO_UNIVERSITARIA", "educacionNoUniversitaria", "institucionEdu", "carreraNoUni", "gradoNoUni", "anioNoUni")
        ]

        for endpoint, tipo_label, list_key, inst_key, tit_key, grad_key, anio_key in edu_endpoints:
            resp = await self._api_get(endpoint, {"IdHojaVida": id_hv})
            if resp:
                edu_list = None
                if isinstance(resp, list):
                    edu_list = resp
                elif isinstance(resp, dict):
                    # Casi siempre está anidado en una clave que suele ser igual a list_key o similar
                    # Pero el JNE es inconsistente, así que buscamos la primera lista que encontremos
                    for k in [list_key, "formacionAcademica", "posgradoVoto"]:
                        if isinstance(resp.get(k), list):
                            edu_list = resp[k]
                            break
                        if isinstance(resp.get(k), dict):
                            # Un nivel más profundo (como en estudiosUniversitarios)
                            nested = resp[k]
                            for sub_k in [list_key, "educacionUniversitaria", "educacionTecnica"]:
                                if isinstance(nested.get(sub_k), list):
                                    edu_list = nested[sub_k]
                                    break
                
                if edu_list and isinstance(edu_list, list):
                    for r in edu_list:
                        if isinstance(r, dict):
                            data["formacion"].append({
                                "tipo": tipo_label,
                                "institucion": r.get(inst_key) or r.get("universidad") or r.get("txEduUniversitaria") or "ND",
                                "titulo": r.get(tit_key) or r.get("carreraUni") or r.get("txCarreraUni") or "ND",
                                "grado": r.get(grad_key) or r.get("grado") or r.get("txBachiller") or "Grado",
                                "anio_fin": r.get(anio_key) or r.get("anioBachiller") or r.get("txAnioBachiller") or None
                            })

        # 3. Experiencia Laboral
        exp_resp = await self._api_get("ExperienciaLaboral", {"IdHojaVida": id_hv})
        if exp_resp:
            exp_list = None
            if isinstance(exp_resp, list):
                exp_list = exp_resp
            elif isinstance(exp_resp, dict):
                # Intentar encontrar la lista en claves comunes
                exp_list = exp_resp.get("experienciaLaboral") or exp_resp.get("listas")
            
            if exp_list and isinstance(exp_list, list):
                for e in exp_list:
                    if isinstance(e, dict):
                        data["experiencia"].append({
                            "sector": "PÚBLICO" if str(e.get("fgTrabajoPublico")) == "1" else "PRIVADO",
                            "institucion": e.get("txItemTrabajo") or e.get("ocupacionProfesion"),
                            "cargo": e.get("txOcupacionProfesion") or e.get("cargo"),
                            "anio_inicio": e.get("txAnioTrabajoDesde") or e.get("anioTrabajoDesde"),
                            "anio_fin": e.get("txAnioTrabajoHasta") or e.get("anioTrabajoHasta")
                        })

        # 4. Ingresos
        ingresos = await self._api_get("ingresosvoto", {"IdHojaVida": id_hv})
        try:
            if ingresos and "declaracionJurada" in ingresos:
                lista_ingresos = ingresos["declaracionJurada"].get("ingreso", [])
                if lista_ingresos:
                    data["ingresos_total"] = float(lista_ingresos[0].get("totalIngresos", 0))
                    data["ingresos_detalle"] = lista_ingresos
        except (ValueError, KeyError, IndexError) as e:
            logger.warning(f"Error parseando ingresos para {id_hv}: {e}")

        # 5. Sentencias Penales
        penales = await self._api_get("sentenciapenal", {"IdHojaVida": id_hv})
        if penales and isinstance(penales, list):
            valid_penales = [s.get("txDelitoPenal", "") for s in penales if isinstance(s, dict)]
            if valid_penales:
                data["tiene_sentencias"] = True
                data["tipo_sentencia"] = "PENAL"
                data["detalle_sentencias"] = "; ".join(valid_penales)[:500]

        # 6. Sentencias Civiles/Obligatorias
        if not data["tiene_sentencias"]:
            civiles = await self._api_get("sentenciaobliga", {"IdHojaVida": id_hv})
            if civiles and isinstance(civiles, list):
                valid_civiles = [s.get("txMateriaSentencia", "") for s in civiles if isinstance(s, dict)]
                if valid_civiles:
                    data["tiene_sentencias"] = True
                    data["tipo_sentencia"] = "CIVIL"
                    data["detalle_sentencias"] = "; ".join(valid_civiles)[:500]

        return data

# Instancia global
jne_client = JNEClient()
