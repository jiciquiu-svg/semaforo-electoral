import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def create_table():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ No DATABASE_URL found in .env")
        return

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()
        
        # Create analytics table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS analytics (
                id SERIAL PRIMARY KEY,
                candidato_dni VARCHAR(20),
                candidato_nombre VARCHAR(200),
                partido VARCHAR(200),
                tipo_visita VARCHAR(50),
                session_id VARCHAR(100),
                created_at TIMESTAMP DEFAULT NOW()
            );
        """)
        
        conn.commit()
        print("✅ Table 'analytics' created or already exists.")
        
        cur.close()
        conn.close()
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    create_table()
