import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def list_tables():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
        tables = cur.fetchall()
        print("--- TABLES IN PUBLIC SCHEMA ---")
        for table in tables:
            print(f"- {table[0]}")
        
        # Check columns for candidates
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'candidatos'")
        cols = cur.fetchall()
        print("\n--- COLUMNS IN 'candidatos' ---")
        for col in cols:
            print(f"- {col[0]}")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    list_tables()
