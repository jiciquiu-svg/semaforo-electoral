import psycopg2
from datetime import datetime

try:
    conn = psycopg2.connect(
        host='localhost',
        port=54333,
        user='admin',
        password='dev_password_2026',
        database='candidatos_db'
    )
    cur = conn.cursor()
    dni = '40703162'
    nombre = 'Candidato Real Prueba'
    
    print(f"Testing INSERT for DNI {dni}...")
    cur.execute("""
        INSERT INTO candidatos (dni, nombres_completos, cargo_postula, partido, ultima_actualizacion)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (dni) DO UPDATE 
        SET nombres_completos = EXCLUDED.nombres_completos,
            ultima_actualizacion = EXCLUDED.ultima_actualizacion
        RETURNING dni;
    """, (dni, nombre, 'DESCONOCIDO', 'DESCONOCIDO', datetime.now()))
    
    res = cur.fetchone()
    print(f"✅ Result: {res}")
    
    conn.commit()
    
    cur.execute("SELECT dni, nombres_completos FROM candidatos WHERE dni = %s", (dni,))
    row = cur.fetchone()
    print(f"🔍 Select after commit: {row}")
    
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
