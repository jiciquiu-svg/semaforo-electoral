import httpx
import logging
import re
import os
import asyncio
import psycopg2
import psycopg2.extras
from typing import List, Dict, Any
from dotenv import load_dotenv

load_dotenv("backend/.env")

# Configuración de logs
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("DiscoveryService")

# API Endpoints de Voto Informado (Base Oficial)
API_LISTAR = "https://web.jne.gob.pe/serviciovotoinformado/api/candidatos/listarcandidatos"
API_TOKEN = "https://web.jne.gob.pe/serviciovotoinformado/api/authentication/token"

# Códigos de Tipo de Elección encontrados en investigación
ELECCIONES = {
    "PRESIDENTES": {"id": 1, "ubi": [""]},
    "SENADORES": {"id": 20, "ubi": [""]},
    "PARLAMENTO_ANDINO": {"id": 3, "ubi": [""]},
    "DIPUTADOS": {
        "id": 15, 
        "ubi": [
            "010000", "020000", "030000", "040000", "050000", "060000", "070000", "080000", 
            "090000", "100000", "110000", "120000", "130000", "140000", "150000", "160000", 
            "170000", "180000", "190000", "200000", "210000", "220000", "230000", "240000", 
            "250000", "270000" # 270000 es Extranjero
        ]
    }
}

ID_PROCESO = 124 # Elecciones 2026 (según investigación)

class DiscoveryService:
    def __init__(self, session_token=None):
        self.db_url = os.getenv("DATABASE_URL")
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36",
            "Content-Type": "application/json",
            "Referer": "https://votoinformado.jne.gob.pe/",
            "Origin": "https://votoinformado.jne.gob.pe",
            "x-session-token": session_token or os.getenv("JNE_SESSION_TOKEN"),
            "Cookie": os.getenv("JNE_COOKIES", "")
        }

    async def _refresh_token(self):
        """Obtiene un nuevo token de sesión desde la API de JNE."""
        logger.info("Solicitando nuevo token de sesión...")
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                # Usar los mismos headers base (UA, Referer)
                headers = {
                    "User-Agent": self.headers["User-Agent"],
                    "Referer": self.headers["Referer"],
                    "Origin": self.headers["Origin"]
                }
                response = await client.get(API_TOKEN, headers=headers)
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

    def _get_db_connection(self):
        return psycopg2.connect(self.db_url)

    async def descubrir_desde_api(self, categoria: str, id_tipo_eleccion: int, ubigeo: str = "") -> int:
        """
        Consulta la API oficial del JNE para obtener la lista de candidatos.
        """
        logger.info(f"Consultando API para {categoria} (ID: {id_tipo_eleccion})")
        
        payload = {
            "idProcesoElectoral": ID_PROCESO,
            "strUbiDepartamento": ubigeo,
            "idTipoEleccion": id_tipo_eleccion
        }
        
        async with httpx.AsyncClient(timeout=30.0, headers=self.headers) as client:
            try:
                response = await client.post(API_LISTAR, json=payload)
                response.raise_for_status()
                
                candidatos = response.json()
                if not isinstance(candidatos, list):
                    logger.error(f"Respuesta inesperada de API: {candidatos}")
                    if response.status_code != 200:
                        logger.error(f"Error Body: {response.text}")
                    return []
                
                nuevos = 0
                conn = self._get_db_connection()
                cur = conn.cursor()
                
                for cand in candidatos:
                    dni = cand.get("txDocId")
                    if not dni: continue
                    
                    # Construir URL de hoja de vida (Pattern: /hoja-vida/{expediente}/{dni}/{codigo})
                    # Investigación: idHojaVida es el 'codigo'. El expediente suele ser el ID_PROCESO o similar.
                    # El patrón exacto observado es: https://votoinformado.jne.gob.pe/hoja-vida/2857/06280714/252450
                    # Para simplificar y asegurar navegación, usaremos el DNI para que el JNE lo resuelva o construiremos el link.
                    # El idHojaVida de la API es el parámetro final.
                    id_hj = cand.get("idHojaVida")
                    # El ID de proceso para el link parece ser dinámico (ej. 2857 para 2026). 
                    # Usaremos una constante base o el DNI para el link de respaldo.
                    full_url = f"https://votoinformado.jne.gob.pe/hoja-vida/2857/{dni}/{id_hj}"
                    
                    nombre = f"{cand.get('txNom', '')} {cand.get('txApePat', '')} {cand.get('txApeMat', '')}".strip()
                    partido = cand.get('txOrgPol', 'Independiente')
                    
                    try:
                        # 1. Seguimiento en pendientes
                        cur.execute("""
                            INSERT INTO pendientes_validacion (dni, url_maestra, url_hoja_vida)
                            VALUES (%s, %s, %s)
                            ON CONFLICT (dni) DO UPDATE SET url_hoja_vida = EXCLUDED.url_hoja_vida
                        """, (dni, categoria, full_url))
                        
                        # 2. Pre-registro en candidatos
                        cur.execute("""
                            INSERT INTO candidatos (dni, nombres_completos, partido, cargo_postula, url_hoja_vida)
                            VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (dni) DO UPDATE 
                            SET url_hoja_vida = EXCLUDED.url_hoja_vida,
                                nombres_completos = COALESCE(NULLIF(EXCLUDED.nombres_completos, ''), candidatos.nombres_completos)
                            RETURNING id
                        """, (dni, nombre, partido, categoria.lower(), full_url))
                        
                        nuevos += 1
                    except Exception as e:
                        logger.error(f"Error procesando {dni}: {e}")
                        conn.rollback()
                
                conn.commit()
                cur.close()
                conn.close()
                
                logger.info(f"API {categoria}: Procesados {len(candidatos)} candidatos. {nuevos} registrados/actualizados.")
                
                # Transformar al formato que espera el orquestador
                result_list = []
                for cand in candidatos:
                    dni = cand.get("txDocId")
                    id_hj = cand.get("idHojaVida")
                    result_list.append({
                        "dni": dni,
                        "nombre_completo": f"{cand.get('txNom', '')} {cand.get('txApePat', '')} {cand.get('txApeMat', '')}".strip(),
                        "partido": cand.get('txOrgPol', 'Independiente'),
                        "cargo_postula": categoria.capitalize(),
                        "url_hoja_vida": f"https://votoinformado.jne.gob.pe/hoja-vida/2857/{dni}/{id_hj}"
                    })
                return result_list

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 401:
                    logger.warning("401 detectado. Intentando refrescar token...")
                    if await self._refresh_token():
                        # Reintentar una vez con el nuevo token
                        return await self.descubrir_desde_api(categoria, id_tipo_eleccion, ubigeo)
                logger.error(f"Error HTTP llamando API para {categoria}: {str(e)}")
                return []
            except Exception as e:
                logger.error(f"Error inesperado llamando API para {categoria}: {str(e)}")
                return []

    async def discover_all(self) -> List[Dict[str, Any]]:
        all_candidates = []
        for cat, info in ELECCIONES.items():
            for ubi in info["ubi"]:
                candidates = await self.descubrir_desde_api(cat, info["id"], ubi)
                if isinstance(candidates, list):
                    all_candidates.extend(candidates)
                # Pequeña pausa para no cansar la API
                await asyncio.sleep(0.5)
        return all_candidates

if __name__ == "__main__":
    import asyncio
    service = DiscoveryService()
    asyncio.run(service.discover_all())
