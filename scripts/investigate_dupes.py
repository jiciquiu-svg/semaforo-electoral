import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def check_duplicates():
    try:
        url = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        
        # 1. Buscar fotos duplicadas
        print("--- BUSCANDO FOTOS DUPLICADAS ---")
        cur.execute("""
            SELECT foto_url, COUNT(*) 
            FROM candidatos 
            WHERE foto_url IS NOT NULL 
            GROUP BY foto_url 
            HAVING COUNT(*) > 1 
            ORDER BY COUNT(*) DESC 
            LIMIT 10
        """)
        dups = cur.fetchall()
        for url_str, count in dups:
            print(f"URL: {url_str}")
            print(f"CANTIDAD: {count}")
            
            # Ver qué candidatos tienen esta foto
            cur.execute("SELECT dni, nombres_completos FROM candidatos WHERE foto_url = %s LIMIT 3", (url_str,))
            cand_dups = cur.fetchall()
            for dni, nombre in cand_dups:
                print(f"  - {nombre} ({dni})")
        
        # 2. Buscar datos académicos repetidos (indicativo de mock data)
        print("\n--- BUSCANDO ESTUDIOS REPETIDOS (PUCP/ABOGADO?) ---")
        cur.execute("""
            SELECT institucion, titulo, COUNT(*) 
            FROM formacion_academica 
            GROUP BY institucion, titulo 
            HAVING COUNT(*) > 10 
            ORDER BY COUNT(*) DESC 
            LIMIT 5
        """)
        edu_dups = cur.fetchall()
        for inst, tit, count in edu_dups:
            print(f"EDU: {inst} - {tit} ({count} veces)")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_duplicates()
