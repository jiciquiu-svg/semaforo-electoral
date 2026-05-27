import psycopg2
import os
from dotenv import load_dotenv

# Load .env
dotenv_path = r'c:\xampp\htdocs\semaforo_electoral\backend\.env'
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv("DATABASE_URL")

def get_db_connection():
    try:
        if DATABASE_URL:
            return psycopg2.connect(DATABASE_URL)
        else:
            return psycopg2.connect(
                host='localhost',
                port=54333,
                user='admin',
                password='dev_password_2026',
                database='candidatos_db'
            )
    except Exception as e:
        print(f"Connection Error: {e}")
        return None

def check_dnis():
    conn = get_db_connection()
    if not conn:
        return
    
    cur = conn.cursor()
    
    dnis_to_check = [
        '00100001', '00100002', '00100003', '00100004', '00100005', 
        '00100006', '00100007', '00100008', '00100009', '00100010',
        '00100011', '00100012', '00100013', '00100014', '00100015',
        '00100016', '00100017', '00100018', '00100019', '00100020',
        '00100021', '00100022', '00100023', '00100024', '00100025',
        '00100026', '00100027', '00100028', '00100029', '00100030',
        '00100031', '00100032', '00100033', '00100034', '00100035', '00100036'
    ]
    
    missing_data = []
    
    print("Checking database for candidate data...")
    for dni in dnis_to_check:
        cur.execute("""
            SELECT 
                (SELECT count(*) FROM formacion_academica WHERE candidato_dni = %s) +
                (SELECT count(*) FROM experiencia_laboral WHERE candidato_dni = %s) +
                (SELECT count(*) FROM declaraciones_juradas WHERE candidato_dni = %s)
        """, (dni, dni, dni))
        
        total_records = cur.fetchone()[0]
        
        if total_records == 0:
            missing_data.append(dni)
            
    print(f"DNIs that need processing: {len(missing_data)}")
    for m in missing_data:
        print(m)
        
    conn.close()

if __name__ == "__main__":
    check_dnis()
