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
    print("Testing INSERT into declaraciones_juradas...")
    cur.execute("""
        INSERT INTO declaraciones_juradas
        (candidato_dni, fecha_declaracion, patrimonio_total, ingresos_anuales, fecha_extraccion)
        VALUES (%s, %s, %s, %s, %s)
    """, ('00000000', '2023-01-01', 1000, 500, datetime.now()))
    conn.commit()
    print("✅ Success!")
    conn.close()
except Exception as e:
    print(f"❌ Error: {e}")
