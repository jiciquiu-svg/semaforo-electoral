import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def list_all_columns():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        tables = ['formacion_academica', 'experiencia_laboral', 'declaraciones_juradas', 'sentencias']
        for table in tables:
            cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
            cols = cur.fetchall()
            print(f"\n--- COLUMNS IN '{table}' ---")
            for col in cols:
                print(f"- {col[0]}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_all_columns()
