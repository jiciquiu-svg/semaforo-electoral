import os
import sys
import asyncio
import logging
import re
from playwright.async_api import async_playwright
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger("TargetedDiscovery")

load_dotenv("backend/.env")

class TargetedDiscovery:
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL")
        self.conn = None
        self.browser = None
        self.context = None

    def connect_db(self):
        self.conn = psycopg2.connect(self.db_url, cursor_factory=RealDictCursor)

    async def init_browser(self):
        pw = await async_playwright().start()
        self.browser = await pw.chromium.launch(headless=True)
        self.context = await self.browser.new_context(viewport={'width': 1280, 'height': 800})

    async def discover_party(self, party_id: str, role_type: str):
        url = f"https://votoinformado.jne.gob.pe/{role_type}?partido={party_id}"
        page = await self.context.new_page()
        all_candidates = []
        try:
            logger.info(f"Descubriendo {role_type} para partido {party_id}")
            await page.goto(url, wait_until="networkidle", timeout=60000)
            await asyncio.sleep(5)

            # 1. Distrito Único (Senadores)
            logger.info("Extrayendo Distrito Único...")
            all_candidates.extend(await self.extract_cards(page, party_id, role_type))

            # 2. Distrito Múltiple (Senadores)
            if role_type == "senadores":
                try:
                    # Intentar hacer clic en la pestaña "Distrito Múltiple"
                    # Selector posible basado en texto o clase
                    tab = await page.query_selector("button:has-text('Distrito Múltiple'), .tab-item:contains('Múltiple')")
                    if tab:
                        await tab.click()
                        await asyncio.sleep(3)
                        logger.info("Extrayendo Distrito Múltiple...")
                        all_candidates.extend(await self.extract_cards(page, party_id, role_type))
                except:
                    logger.warning("No se pudo acceder a Distrito Múltiple.")

            # 3. Diputados (Requiere selección de región)
            if role_type == "diputados":
                # Solo haremos Lima Metropolitana por ahora como prueba robusta
                # En una versión final se iteraría por las 27 regiones
                logger.info("Ajustando región para Diputados (Prueba Lima)...")
                # Lógica para seleccionar 'LIMA METROPOLITANA' en el dropdown
                # ... 
                pass

            return all_candidates
        finally:
            await page.close()

    async def extract_cards(self, page, party_id, role):
        cards = await page.query_selector_all("app-card-candidato, .card-candidato")
        candidates = []
        for card in cards:
            try:
                name_el = await card.query_selector("h3, .nombre-candidato")
                name = await name_el.inner_text() if name_el else "DESCONOCIDO"
                link_el = await card.query_selector("a[href*='/hoja-vida/']")
                hv_url = await link_el.get_attribute("href") if link_el else None
                if hv_url and not hv_url.startswith("http"):
                    hv_url = "https://votoinformado.jne.gob.pe" + hv_url
                
                dni = hv_url.split("/")[5] if hv_url and len(hv_url.split("/")) >= 6 else None
                candidates.append({
                    "dni": dni, "nombre": name.strip().upper(),
                    "hv_url": hv_url, "partido_id": party_id, "cargo": role.upper()
                })
            except: pass
        return candidates


    def upsert_candidates(self, candidates, party_name):
        if not candidates: return
        self.connect_db()
        cur = self.conn.cursor()
        count = 0
        for cand in candidates:
            if not cand["dni"] or not cand["hv_url"]: continue
            query = """
            INSERT INTO candidatos (dni, nombres_completos, partido, cargo_postula, url_hoja_vida, organizacion_id, fuente_datos)
            VALUES (%s, %s, %s, %s, %s, %s, 'JNE_TARGETED')
            ON CONFLICT (dni) DO UPDATE SET
                url_hoja_vida = EXCLUDED.url_hoja_vida,
                cargo_postula = EXCLUDED.cargo_postula,
                organizacion_id = EXCLUDED.organizacion_id;
            """
            cur.execute(query, (
                cand["dni"], cand["nombre"], party_name, cand["cargo"],
                cand["hv_url"], cand["partido_id"]
            ))
            count += 1
        self.conn.commit()
        self.conn.close()
        logger.info(f"UPSERT finalizado para {count} candidatos de {party_name}.")

    async def run(self):
        await self.init_browser()
        
        # 1. Fuerza Popular
        fp_cands = await self.discover_party("1366", "senadores")
        self.upsert_candidates(fp_cands, "FUERZA POPULAR")
        
        # 2. Avanza País - Senadores
        ap_sen = await self.discover_party("2173", "senadores")
        self.upsert_candidates(ap_sen, "AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL")
        
        # 3. Avanza País - Diputados
        ap_dip = await self.discover_party("2173", "diputados")
        self.upsert_candidates(ap_dip, "AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL")
        
        await self.browser.close()

if __name__ == "__main__":
    discovery = TargetedDiscovery()
    asyncio.run(discovery.run())
