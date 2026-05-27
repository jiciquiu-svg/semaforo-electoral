import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def final_check():
    try:
        url = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(url)
        cur = conn.cursor()
        cur.execute("SELECT dni, nombres_completos FROM candidatos WHERE dni = '00100001'")
        row = cur.fetchone()
        if row:
            print(f"CONFIRMADO: {row[1]} (DNI {row[0]}) existe en la BD NUBE.")
        else:
            print("ERROR: El candidato no existe en la BD NUBE.")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    final_check()
