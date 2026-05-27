import psycopg2
import os
from dotenv import load_dotenv

# Cargar variables del backend
load_dotenv(dotenv_path='backend/.env')

def check_candidatos():
    try:
        database_url = os.getenv("DATABASE_URL")
        if not database_url:
            print("❌ No se encontró DATABASE_URL en backend/.env")
            return

        conn = psycopg2.connect(database_url)
        cur = conn.cursor()

        # Consulta detallada
        cur.execute("""
            SELECT dni, nombres_completos, partido, cargo_postula 
            FROM candidatos 
            ORDER BY partido, nombres_completos
        """)
        
        candidates = cur.fetchall()
        
        print("=" * 60)
        print(f"{'DNI':<10} | {'NOMBRE':<30} | {'PARTIDO'}")
        print("-" * 60)
        
        for dna, nombre, partido, cargo in candidates:
            print(f"{dna:<10} | {nombre[:30]:<30} | {partido}")
            
        print("-" * 60)
        print(f"TOTAL: {len(candidates)} candidatos encontrados.")
        print("=" * 60)

        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_candidatos()
