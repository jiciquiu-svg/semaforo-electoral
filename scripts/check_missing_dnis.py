import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(r'c:\xampp\htdocs\semaforo_electoral\backend\.env')

def check_dnis():
    conn = psycopg2.connect(
        os.getenv("DATABASE_URL") or "dbname=candidatos_db user=admin password=dev_password_2026 host=localhost port=54333"
    )
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
    
    for dni in dnis_to_check:
        # Check if DNI has records in any of the 3 tables
        has_formacion = False
        has_experiencia = False
        has_declaraciones = False
        
        cur.execute("SELECT count(*) FROM formacion_academica WHERE candidato_dni = %s", (dni,))
        if cur.fetchone()[0] > 0: has_formacion = True
        
        cur.execute("SELECT count(*) FROM experiencia_laboral WHERE candidato_dni = %s", (dni,))
        if cur.fetchone()[0] > 0: has_experiencia = True
        
        cur.execute("SELECT count(*) FROM declaraciones_juradas WHERE candidato_dni = %s", (dni,))
        if cur.fetchone()[0] > 0: has_declaraciones = True
        
        if not (has_formacion or has_experiencia or has_declaraciones):
            missing_data.append(dni)
            
    print(f"Missing data DNIs: {missing_data}")
    conn.close()

if __name__ == "__main__":
    check_dnis()
