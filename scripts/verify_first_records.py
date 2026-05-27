import psycopg2
import os
from dotenv import load_dotenv

# Cargar variables del backend
load_dotenv(dotenv_path='backend/.env')

def print_candidate(cur, cand):
    dni, nombre, partido, foto, ingresos, sentencias = cand
    print("-" * 50)
    print(f"CANDIDATO: {nombre} (DNI: {dni})")
    print(f"PARTIDO:   {partido}")
    print(f"FOTO URL:  {foto[:50] + '...' if foto else '❌ NO TIENE'}")
    print(f"INGRESOS:  S/ {ingresos if ingresos else 0.0}")
    print(f"SENTENCIAS: {'⚠️ SÍ' if sentencias else '✅ NO'}")

    cur.execute("SELECT COUNT(*) FROM formacion_academica WHERE candidato_dni = %s", (dni,))
    form_count = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM experiencia_laboral WHERE candidato_dni = %s", (dni,))
    exp_count = cur.fetchone()[0]
    print(f"DATOS:      Estudios({form_count}), Experiencia({exp_count})")

def verify_enrichment():
    try:
        url = os.getenv("DATABASE_URL")
        print(f"Conectando a: {url.split('@')[-1] if url else 'Local'}")
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        # 1. Muestra de enriquecidos
        print("\n--- MUESTRA DE CANDIDATOS RECIENTEMENTE ENRIQUECIDOS (CON FOTO) ---")
        cur.execute("""
            SELECT dni, nombres_completos, partido, foto_url, ingresos_total, tiene_sentencias 
            FROM candidatos 
            WHERE foto_url IS NOT NULL
            ORDER BY ultima_actualizacion DESC
            LIMIT 3
        """)
        enriched = cur.fetchall()
        for cand in enriched:
            print_candidate(cur, cand)

        # 2. Muestra de pendientes
        print("\n--- MUESTRA DE CANDIDATOS SIN FOTO (PENDIENTES O FALLIDOS) ---")
        cur.execute("""
            SELECT dni, nombres_completos, partido, foto_url, ingresos_total, tiene_sentencias 
            FROM candidatos 
            WHERE foto_url IS NULL
            ORDER BY ultima_actualizacion DESC
            LIMIT 2
        """)
        pending = cur.fetchall()
        for cand in pending:
            print_candidate(cur, cand)

        # 3. Resumen total
        cur.execute("SELECT COUNT(*) FROM candidatos WHERE foto_url IS NOT NULL")
        con_foto = cur.fetchone()[0]
        cur.execute("SELECT COUNT(*) FROM candidatos")
        total = cur.fetchone()[0]
        
        print("\n=== RESUMEN GENERAL ===")
        print(f"Total candidatos: {total}")
        print(f"Enriquecidos (con foto): {con_foto} ({round(con_foto/total*100, 2) if total > 0 else 0}%)")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    verify_enrichment()
