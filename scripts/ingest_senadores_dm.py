"""
Ingesta de Senadores de Distrito Múltiple - Todas las regiones
Usa idTipoEleccion=21 y los ubigeos obtenidos por inspección.
"""
import asyncio
import httpx
import psycopg2
import os
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv("backend/.env")

API_LISTAR = "https://web.jne.gob.pe/serviciovotoinformado/api/candidatos/listarcandidatos"
API_TOKEN  = "https://web.jne.gob.pe/serviciovotoinformado/api/authentication/token"
ID_PROCESO = 124
ID_TIPO_SENADORES = 21  # 21 = Distrito Múltiple, 20 = Distrito Único

# Mapping confirmed by browser inspection
DISTRITOS_ELECTORALES = {
    "010000": "AMAZONAS",
    "020000": "ANCASH",
    "030000": "APURIMAC",
    "040000": "AREQUIPA",
    "050000": "AYACUCHO",
    "060000": "CAJAMARCA",
    "240000": "CALLAO",
    "070000": "CUSCO",
    "080000": "HUANCAVELICA",
    "090000": "HUANUCO",
    "100000": "ICA",
    "110000": "JUNIN",
    "120000": "LA LIBERTAD",
    "130000": "LAMBAYEQUE",
    "140100": "LIMA METROPOLITANA",
    "140000": "LIMA PROVINCIAS",
    "150000": "LORETO",
    "160000": "MADRE DE DIOS",
    "170000": "MOQUEGUA",
    "180000": "PASCO",
    "140133": "PERUANOS EN EL EXTRANJERO",
    "190000": "PIURA",
    "200000": "PUNO",
    "210000": "SAN MARTIN",
    "220000": "TACNA",
    "230000": "TUMBES",
    "250000": "UCAYALI",
}

DB_URL = os.getenv("DATABASE_URL")

async def get_token(client):
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
        "Referer": "https://votoinformado.jne.gob.pe/",
        "Origin": "https://votoinformado.jne.gob.pe"
    }
    resp = await client.get(API_TOKEN, headers=headers)
    resp.raise_for_status()
    return resp.json().get("token")

async def fetch_senadores_distrito(client, headers, ubigeo, distrito_nombre):
    payload = {
        "idProcesoElectoral": ID_PROCESO,
        "strUbiDepartamento": ubigeo,
        "idTipoEleccion": ID_TIPO_SENADORES
    }
    try:
        resp = await client.post(API_LISTAR, json=payload, headers=headers)
        if resp.status_code == 401:
            return None
        resp.raise_for_status()
        data = resp.json()
        return data if isinstance(data, list) else []
    except Exception as e:
        print(f"  ERROR {distrito_nombre}: {e}")
        return []

async def main():
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    
    # Ensure current senators are marked as DISTRITO UNICO if they don't have a value
    cur.execute("""
        UPDATE candidatos 
        SET distrito_electoral = 'DISTRITO UNICO' 
        WHERE cargo_postula ILIKE '%%senador%%' AND distrito_electoral IS NULL
    """)
    conn.commit()

    async with httpx.AsyncClient(timeout=30.0) as client:
        token = await get_token(client)
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
            "Content-Type": "application/json",
            "Referer": "https://votoinformado.jne.gob.pe/",
            "Origin": "https://votoinformado.jne.gob.pe",
            "x-session-token": token
        }
        
        total_nuevos = 0
        
        for ubigeo, nombre in DISTRITOS_ELECTORALES.items():
            print(f"Procesando {nombre} ({ubigeo})...")
            candidatos = await fetch_senadores_distrito(client, headers, ubigeo, nombre)
            
            if candidatos is None:
                token = await get_token(client)
                headers["x-session-token"] = token
                candidatos = await fetch_senadores_distrito(client, headers, ubigeo, nombre)
                if candidatos is None: candidatos = []
            
            nuevos = 0
            for cand in candidatos:
                dni = cand.get("txDocId")
                if not dni: continue
                
                nombre_completo = f"{cand.get('txNom', '')} {cand.get('txApePat', '')} {cand.get('txApeMat', '')}".strip()
                partido = cand.get('txOrgPol', '')
                id_hj = cand.get("idHojaVida")
                url_hv = f"https://votoinformado.jne.gob.pe/hoja-vida/2857/{dni}/{id_hj}"
                foto_id = cand.get("idHojaVida")
                foto_url = f"https://mpesije.jne.gob.pe/apidocs/fotos/2857/{dni}.jpg" # Guessing photo URL pattern or leaving for enricher

                try:
                    cur.execute("""
                        INSERT INTO candidatos (dni, nombres_completos, partido, cargo_postula, 
                                              url_hoja_vida, distrito_electoral, nivel_criticidad, color,
                                              mensaje_ciudadano, puntaje_transparencia, estado_habilitado)
                        VALUES (%s, %s, %s, 'senadores', %s, %s, 'verde', 'verde',
                                'Información en verificación', 0, true)
                        ON CONFLICT (dni) DO UPDATE 
                        SET distrito_electoral = EXCLUDED.distrito_electoral 
                        WHERE candidatos.distrito_electoral IS NULL
                    """, (dni, nombre_completo, partido, url_hv, f"DISTRITO MULTIPLE - {nombre}"))
                    
                    if cur.rowcount > 0:
                        nuevos += 1
                except Exception as e:
                    print(f"    Error {dni}: {e}")
                    conn.rollback()
            
            conn.commit()
            total_nuevos += nuevos
            print(f"  {nombre}: {len(candidatos)} API | {nuevos} Nuevos")
            await asyncio.sleep(0.5)

    print(f"\nFinalizado. Total nuevos: {total_nuevos}")
    conn.close()

if __name__ == "__main__":
    asyncio.run(main())
