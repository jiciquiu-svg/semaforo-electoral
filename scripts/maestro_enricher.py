import os
import sys
import asyncio
import logging
import re
from bs4 import BeautifulSoup
import psutil
import gc
from playwright.async_api import async_playwright
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Configuración de logs
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("MaestroEnricher")

load_dotenv("backend/.env")

class MaestroEnricher:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.conn = None
        self.browser = None
        self.context = None
        self.batch_size = 20
        self.target_parties = [
            'FUERZA POPULAR',
            'AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL'
        ]

    def connect_db(self):
        try:
            self.conn = psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)
            logger.info("Conectado a la base de datos.")
        except Exception as e:
            logger.error(f"Error conectando a DB: {e}")
            sys.exit(1)

    async def init_browser(self):
        self.pw = await async_playwright().start()
        self.browser = await self.pw.chromium.launch(headless=True)
        logger.info("Navegador inicializado.")

    async def init_context(self):
        """Inicializa un contexto fresco (incógnito) para evitar acumulación de historia/cache."""
        if self.context:
            await self.context.close()
        self.context = await self.browser.new_context(
            viewport={'width': 1280, 'height': 800},
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36"
        )
        logger.info("Nuevo contexto de navegación (Incógnito) iniciado.")

    async def scrape_candidate(self, url: str):
        page = await self.context.new_page()
        try:
            logger.info(f"Navegando a: {url}")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            
            # 1. Bypass Banners / Wait for load
            # El usuario dice: "asegúrate de que el elemento .card-candidato esté totalmente cargado"
            try:
                await page.wait_for_selector("img.w-full.h-full.object-cover", timeout=10000)
            except:
                logger.warning("Timeout esperando imagen, intentando continuar...")

            content = await page.content()
            soup = BeautifulSoup(content, 'html.parser')

            data = {
                "foto_url": None,
                "nombres_completos": None,
                "dni": None,
                "patrimonio_total": 0.0,
                "semaforo_alerta": False,
                "color": "GRAY",
                "organizacion_id": None
            }

            # --- IDENTIFICACIÓN ---
            # Nombre: Extraer del h2 con clase uppercase
            h2_name = soup.find("h2", class_="uppercase")
            if h2_name:
                data["nombres_completos"] = h2_name.get_text(strip=True).upper()

            # DNI: Extraer del span que sigue al texto DNI:
            dni_label = soup.find("span", string=re.compile("DNI:", re.I))
            if dni_label:
                dni_val = dni_label.find_next_sibling("span")
                if dni_val:
                    data["dni"] = dni_val.get_text(strip=True)

            # --- FOTO ---
            # Selector: img.w-full.h-full.object-cover
            img_foto = soup.select_one("img.w-full.h-full.object-cover")
            if img_foto and img_foto.get("src"):
                src = img_foto["src"]
                # Regla de Oro: Prioriza siempre las URLs que apunten a https://mpesije.jne.gob.pe/
                if "mpesije.jne.gob.pe" in src:
                    data["foto_url"] = src
                else:
                    logger.warning(f"Foto detectada no es de mpesije: {src}")

            # --- ORGANIZACIÓN ---
            # Usa el ID del partido detectado en la URL (LogoOp/{ID}.jpg)
            img_logo = soup.select_one("img[src*='LogoOp/']")
            if img_logo:
                logo_src = img_logo["src"]
                match_id = re.search(r"LogoOp/(\d+)\.jpg", logo_src)
                if match_id:
                    data["organizacion_id"] = int(match_id.group(1))

            # --- FINANZAS (SUMA PATRIMONIAL) ---
            # Ingresos: Remuneración Bruta Privado y Remuneración Bruta Público.
            ing_pub = 0.0
            ing_priv = 0.0
            
            pub_label = soup.find("span", string=re.compile("Remuneración Bruta Público", re.I))
            if pub_label:
                val = pub_label.find_next("span", class_="text-right")
                if val:
                    ing_pub = self.clean_currency(val.get_text())

            priv_label = soup.find("span", string=re.compile("Remuneración Bruta Privado", re.I))
            if priv_label:
                val = priv_label.find_next("span", class_="text-right")
                if val:
                    ing_priv = self.clean_currency(val.get_text())

            # Bienes: Itera sobre la tabla de BIENES MUEBLES - INMUEBLES.
            # Lógica: Suma cada Valor Autovaluo
            bienes_sum = 0.0
            bienes_section = soup.find("button", string=re.compile("BIENES MUEBLES - INMUEBLES", re.I))
            if bienes_section:
                # La tabla suele estar después del botón o en su contenedor expandido
                parent = bienes_section.find_parent("div")
                if parent:
                    rows = parent.select("table tbody tr")
                    for row in rows:
                        cells = row.find_all("td")
                        if len(cells) >= 3:
                            val_str = cells[2].get_text(strip=True)
                            bienes_sum += self.clean_currency(val_str)

            data["patrimonio_total"] = ing_pub + ing_priv + bienes_sum

            # --- ESTUDIOS (POSTGRADO) ---
            # Especialmente para Avanza País
            data["estudios_postgrado"] = []
            postgrado_section = soup.find("button", string=re.compile("ESTUDIOS DE POSTGRADO", re.I))
            if postgrado_section:
                container = postgrado_section.find_parent("div")
                if container:
                    # Itera sobre la tabla de postgrados
                    rows = container.select("table tbody tr")
                    for row in rows:
                        cells = row.find_all("td")
                        if len(cells) >= 3:
                            grado = cells[0].get_text(strip=True)
                            universidad = cells[1].get_text(strip=True)
                            especialidad = cells[3].get_text(strip=True) if len(cells) > 3 else ""
                            data["estudios_postgrado"].append(f"{grado} en {especialidad} ({universidad})")

            # Force close before returning to save RAM
            await page.close()
            return data

        except Exception as e:
            logger.error(f"Error scrapeando {url}: {e}")
            if not page.is_closed():
                await page.close()
            return None

    def clean_currency(self, text: str) -> float:
        """Limpia los strings (quita el 'S/ ' y las comas) y convierte a float."""
        if not text: return 0.0
        # Remover 'S/', comas, espacios
        clean = re.sub(r"[S/\s,]", "", text)
        try:
            return float(clean)
        except:
            return 0.0

    def upsert_candidate(self, data: dict):
        if not data or not data.get("dni"): return
        
        query = """
        UPDATE candidatos SET
            foto_url = %s,
            patrimonio_total = %s,
            semaforo_alerta = %s,
            color = %s,
            organizacion_id = %s,
            ultima_actualizacion = NOW()
        WHERE dni = %s;
        """
        try:
            cur = self.conn.cursor()
            cur.execute(query, (
                data["foto_url"], data["patrimonio_total"], data["semaforo_alerta"], 
                data["color"], data["organizacion_id"], data["dni"]
            ))
            self.conn.commit()
            logger.info(f"UPDATE Exitoso: {data['dni']} - {data['nombres_completos']} (Patrimonio: {data['patrimonio_total']})")
        except Exception as e:
            logger.error(f"Error en UPDATE para {data['dni']}: {e}")
            self.conn.rollback()

    async def run(self, dnis=None, limit=200):
        self.connect_db()
        await self.init_browser()
        
        try:
            cur = self.conn.cursor()
            if dnis:
                cur.execute("SELECT url_hoja_vida, dni, nombres_completos FROM candidatos WHERE dni IN %s", (tuple(dnis),))
            else:
                query = """
                    SELECT url_hoja_vida, dni, nombres_completos 
                    FROM candidatos 
                    WHERE url_hoja_vida IS NOT NULL 
                      AND (foto_url IS NULL OR patrimonio_total IS NULL OR patrimonio_total = 0)
                      AND partido IN %s
                    LIMIT %s
                """
                cur.execute(query, (tuple(self.target_parties), limit))
            
            rows = cur.fetchall()
            total = len(rows)
            logger.info(f"Iniciando procesamiento de {total} candidatos en lotes de {self.batch_size}...")

            for i in range(0, total, self.batch_size):
                batch = rows[i:i + self.batch_size]
                logger.info(f"--- PROCESANDO LOTE {i // self.batch_size + 1} ({len(batch)} registros) ---")
                
                await self.init_context()
                
                for row in batch:
                    url = row["url_hoja_vida"]
                    nombre = row["nombres_completos"]
                    dni = row["dni"]
                    
                    logger.info(f"[*] {nombre} ({dni})")
                    data = await self.scrape_candidate(url)
                    if data:
                        self.upsert_candidate(data)
                        # Fuerza el cierre de la pestaña ya se maneja en el finally de scrape_candidate
                    
                # Limpieza de lote
                await self.context.close()
                self.context = None
                gc.collect()
                mem = psutil.Process().memory_info().rss / (1024 * 1024)
                logger.info(f"Lote finalizado. Memoria actual: {mem:.2f} MB. GC ejecutado.")

        finally:
            if self.browser:
                await self.browser.close()
            if self.pw:
                await self.pw.stop()
            if self.conn:
                self.conn.close()
            logger.info("Sesión finalizada y recursos liberados.")

if __name__ == "__main__":
    enricher = MaestroEnricher()
    # Ejecutamos con un limite alto para completar el procesamiento de los partidos objetivo
    asyncio.run(enricher.run(limit=2000))
