import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def inspect():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # 1. Datos de un candidato de ejemplo
        cur.execute("SELECT * FROM candidatos LIMIT 1")
        sample = cur.fetchone()
        print("--- EJEMPLO DE CANDIDATO ---")
        print(json.dumps(dict(sample), indent=2, default=str))
        print("\n")

        # 2. Relaciones de llaves foráneas
        cur.execute("""
            SELECT
                tc.table_name, 
                kcu.column_name, 
                ccu.table_name AS foreign_table_name,
                ccu.column_name AS foreign_column_name 
            FROM 
                information_schema.table_constraints AS tc 
                JOIN information_schema.key_column_usage AS kcu
                  ON tc.constraint_name = kcu.constraint_name
                  AND tc.table_schema = kcu.table_schema
                JOIN information_schema.constraint_column_usage AS ccu
                  ON ccu.constraint_name = tc.constraint_name
                  AND ccu.table_schema = tc.table_schema
            WHERE tc.constraint_type = 'FOREIGN KEY' 
              AND (tc.table_name = 'candidatos' OR ccu.table_name = 'candidatos');
        """)
        relations = cur.fetchall()
        print("--- RELACIONES DETECTADAS ---")
        for rel in relations:
            print(f"{rel['table_name']}.{rel['column_name']} -> {rel['foreign_table_name']}.{rel['foreign_column_name']}")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    import psycopg2.extras
    inspect()
