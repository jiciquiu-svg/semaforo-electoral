import asyncio
import os
import sys
import logging
import psycopg2
import psycopg2.extras
from datetime import datetime
from dotenv import load_dotenv

# Asegurar que el path incluya el backend para importaciones de servicios
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.jne_client import jne_client
load_dotenv('backend/.env')

# Configuración de colores para terminal (ANSI)
GREEN = "\033[92m"
BLUE = "\033[94m"
RESET = "\033[0m"

logging.basicConfig(level=logging.INFO, format='%(message)s')
logger = logging.getLogger("MassEnricher")

class MassEnricher:
    def __init__(self, concurrency=3):
        self.db_url = os.getenv("DATABASE_URL")
        self.semaphore = asyncio.Semaphore(concurrency)
        self.total_procesados = 0
        self.batch_counter = 0
        self.stop_requested = False

    def _get_db_connection(self):
        """Obtiene conexión a Supabase usando la URL de .env."""
        db_url = self.db_url
        if not db_url:
            raise ValueError("DATABASE_URL no está definida en .env")
        
        # Simplemente aseguramos sslmode si no está
        if "sslmode=" not in db_url:
            db_url += "&sslmode=require" if "?" in db_url else "?sslmode=require"

        return psycopg2.connect(db_url)

    async def enriquecer_uno(self, cand):
        """Procesa un solo candidato bajo control de semáforo."""
        if self.stop_requested:
            return False
            
        async with self.semaphore:
            dni = cand['dni']
            url_hv = cand.get('url_hoja_vida') or cand.get('hoja_vida_url')
            nombre = cand.get('nombres_completos', 'Candidato')
            
            # Auditoría: Verificar si ya fue procesado por otro hilo/proceso
            conn = self._get_db_connection()
            cur = conn.cursor()
            cur.execute("SELECT foto_url FROM candidatos WHERE dni = %s", (dni,))
            res = cur.fetchone()
            cur.close()
            conn.close()
            
            if res and res[0]:
                print(f">> [SALTANDO] DNI {dni} - Ya procesado.")
                return False

            try:
                # 1. Obtener datos enriquecidos desde JNE
                datos = await jne_client.enriquecer_candidato(dni, url_hv)
                
                if datos:
                    # 2. Persistencia en DB
                    self._update_db(dni, url_hv, datos)
                    
                    self.total_procesados += 1
                    self.batch_counter += 1
                    
                    # Log de éxito visual
                    print(f"{GREEN}OK [{self.total_procesados}] Enriquecido: {nombre} ({dni}){RESET}")
                    
                    # Reporte de hito cada 50
                    if self.batch_counter >= 50:
                        print(f"\n{BLUE}[HITO] 50 candidatos más grabados. Total actual: {self.total_procesados}{RESET}\n")
                        self.batch_counter = 0
                        
                    return True
                else:
                    print(f"⚠️ Sin datos para: {nombre} ({dni})")
                    return False
                
            except Exception as e:
                print(f"❌ Error en {dni}: {e}")
                return False
            finally:
                # Pequeño respiro para no saturar la conexión
                await asyncio.sleep(0.1)

    async def run_mass_enrichment(self, limit=1000):
        """Orquesta la carga masiva con concurrencia controlada."""
        print(f"{BLUE}[INFO] Buscando candidatos pendientes...{RESET}")
        conn = self._get_db_connection()
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
        
        # Paso 1: Filtro de candidatos pendientes (Salto Selectivo)
        query = """
            SELECT dni, nombres_completos, partido, url_hoja_vida 
            FROM candidatos 
            WHERE foto_url IS NULL 
              AND (partido != 'AHORA NACION - AN' OR partido IS NULL)
              AND nombres_completos NOT ILIKE '%%MIRTHA%%VASQUEZ%%'
              AND url_hoja_vida IS NOT NULL
            ORDER BY cargo_postula ASC
            LIMIT %s
        """
        cur.execute(query, (limit,))
        pendientes = cur.fetchall()
        cur.close()
        conn.close()
        
        if not pendientes:
            print("✨ ¡Todo el universo está al día! No hay más por enriquecer.")
            return

        print(f"{BLUE}[START] Iniciando Ingesta Inteligente (Concurrencia: {self.semaphore._value}){RESET}")
        print(f"[*] Objetivo del batch: {len(pendientes)} candidatos\n")

        # Paso 2: El Freno de Auditoría (Tu validación manual)
        for cand in pendientes:
            if self.stop_requested:
                break
            
            nombre = cand['nombres_completos'].upper()
            partido = (cand.get('partido') or "").upper()
            
            if ("MIRTHA" in nombre and "VASQUEZ" in nombre) or ("AHORA NACION" in partido):
                print(f"\n[STOP] Condición de bucle detectada en: {nombre} ({partido}). Abortando...")
                self.stop_requested = True
                break

            # Ejecutamos con await para respetar el flujo secuencial de auditoría solicitado
            # Aunque mantenemos el semáforo dentro por seguridad si se lanzaran tareas paralelas
            await self.enriquecer_uno(cand)

        print(f"\n{GREEN}[DONE] SESIÓN FINALIZADA: {self.total_procesados} enriquecidos con éxito.{RESET}")

    def _update_db(self, dni, url_hoja_vida, datos):
        """Persistencia atómica en Supabase/PostgreSQL."""
        conn = self._get_db_connection()
        try:
            cur = conn.cursor()
            
            # 1. Actualizar Candidato Principal
            cur.execute("""
                UPDATE candidatos 
                SET foto_url = %s,
                    ingresos_total = %s,
                    tiene_sentencias = %s,
                    tipo_sentencia = %s,
                    ultima_actualizacion = %s
                WHERE dni = %s
            """, (
                datos.get("foto_url"),
                datos.get("ingresos_total", 0.0),
                datos.get("tiene_sentencias", False),
                datos.get("tipo_sentencia"),
                datetime.now(),
                dni
            ))

            # 2. Tablas relacionadas (Limpiar e Insertar para consistencia)
            # Formación
            if datos.get("formacion"):
                cur.execute("DELETE FROM formacion_academica WHERE candidato_dni = %s", (dni,))
                for f in datos.get("formacion", []):
                    cur.execute("""
                        INSERT INTO formacion_academica (candidato_dni, tipo, institucion, titulo, grado, anio_fin, fuente)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (dni, f['tipo'], f['institucion'], f['titulo'], f['grado'], f['anio_fin'], 'JNE'))

            # Experiencia
            if datos.get("experiencia"):
                cur.execute("DELETE FROM experiencia_laboral WHERE candidato_dni = %s", (dni,))
                for e in datos.get("experiencia", []):
                    # Manejo de años: si la DB requiere DATE, formamos una fecha falsa como '2024-01-01'. 
                    # Si e.get('anio_inicio') es '2024', lo convertimos.
                    f_inicio = f"{e.get('anio_inicio')}-01-01" if e.get('anio_inicio') else None
                    f_fin = f"{e.get('anio_fin')}-12-31" if e.get('anio_fin') else None
                    cur.execute("""
                        INSERT INTO experiencia_laboral (candidato_dni, sector, institucion, cargo, fecha_inicio, fecha_fin, fuente)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (dni, e['sector'], e['institucion'], e['cargo'], f_inicio, f_fin, 'JNE'))

            # Sentencias
            if datos.get("tiene_sentencias") and datos.get("detalle_sentencias"):
                cur.execute("DELETE FROM sentencias WHERE candidato_dni = %s", (dni,))
                cur.execute("""
                    INSERT INTO sentencias (candidato_dni, delito, enlace_fuente)
                    VALUES (%s, %s, %s)
                """, (dni, datos.get("detalle_sentencias"), url_hoja_vida))

            conn.commit()
            cur.close()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

if __name__ == "__main__":
    # Concurrencia de 4 para cuidar la RAM (Estrategia Salto Selectivo)
    enricher = MassEnricher(concurrency=4)
    asyncio.run(enricher.run_mass_enrichment(limit=6000))
