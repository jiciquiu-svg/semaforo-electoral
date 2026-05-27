import psycopg2, os
from dotenv import load_dotenv
load_dotenv('backend/.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Check what cargo types we have for AHORA NACION
cur.execute("""
    SELECT cargo_postula, COUNT(*) 
    FROM candidatos 
    WHERE partido = 'AHORA NACION - AN'
    GROUP BY cargo_postula 
    ORDER BY cargo_postula
""")
rows = cur.fetchall()

with open('verificacion_tipos_cargo.txt', 'w', encoding='utf-8') as f:
    f.write("AHORA NACION - AN: Distribución por cargo\n")
    f.write("=" * 60 + "\n")
    for cargo, total in rows:
        f.write(f"  {cargo}: {total}\n")
    
    # Check all parties' senator counts
    f.write("\n\nSENADORES POR PARTIDO (todos):\n")
    f.write("=" * 60 + "\n")
    cur.execute("""
        SELECT partido, COUNT(*) as total
        FROM candidatos 
        WHERE cargo_postula ILIKE '%%senador%%'
        GROUP BY partido 
        ORDER BY total DESC
    """)
    for partido, total in cur.fetchall():
        f.write(f"  {total:>4}  {partido}\n")
    
    # Check if we have any column for distrito type
    f.write("\n\nCOLUMNAS EN TABLA CANDIDATOS:\n")
    f.write("=" * 60 + "\n")
    cur.execute("""
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'candidatos'
        ORDER BY ordinal_position
    """)
    for col, dtype in cur.fetchall():
        f.write(f"  {col}: {dtype}\n")

    # Sample a senator to see all fields
    f.write("\n\nEJEMPLO SENADOR AHORA NACION:\n")
    f.write("=" * 60 + "\n")
    cur.execute("""
        SELECT * FROM candidatos 
        WHERE partido = 'AHORA NACION - AN' AND cargo_postula ILIKE '%%senador%%'
        LIMIT 1
    """)
    cols = [desc[0] for desc in cur.description]
    row = cur.fetchone()
    if row:
        for c, v in zip(cols, row):
            f.write(f"  {c}: {v}\n")

conn.close()
print("Verificación generada: verificacion_tipos_cargo.txt")
