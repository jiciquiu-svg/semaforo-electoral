import psycopg2, os
from dotenv import load_dotenv
load_dotenv('backend/.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Senadores de AHORA NACION en nuestra DB
cur.execute("""
    SELECT dni, nombres_completos, cargo_postula, foto_url 
    FROM candidatos 
    WHERE partido = 'AHORA NACION - AN' 
      AND cargo_postula ILIKE '%%senador%%'
    ORDER BY nombres_completos
""")
senadores = cur.fetchall()

with open('verificacion_ahora_nacion_senadores.txt', 'w', encoding='utf-8') as f:
    f.write("VERIFICACIÓN: SENADORES - AHORA NACION - AN\n")
    f.write("Fuente JNE: https://votoinformado.jne.gob.pe/senadores?partido=2980\n")
    f.write("=" * 80 + "\n\n")
    f.write(f"Total senadores en DB: {len(senadores)}\n\n")
    f.write(f"{'#':>3} | {'DNI':<10} | {'NOMBRE':<45} | {'FOTO':>4}\n")
    f.write("-" * 80 + "\n")
    for i, (dni, nombre, cargo, foto) in enumerate(senadores, 1):
        has_foto = "✅" if foto and len(str(foto)) > 5 else "❌"
        f.write(f"{i:3d} | {dni:<10} | {nombre:<45} | {has_foto}\n")

    # Tambien listar otros cargos del partido
    f.write(f"\n\n{'='*80}\n")
    f.write("RESUMEN COMPLETO AHORA NACION - AN:\n")
    cur.execute("""
        SELECT cargo_postula, COUNT(*) 
        FROM candidatos 
        WHERE partido = 'AHORA NACION - AN'
        GROUP BY cargo_postula 
        ORDER BY cargo_postula
    """)
    for cargo, total in cur.fetchall():
        f.write(f"  {cargo}: {total}\n")

conn.close()
print("Verificación generada: verificacion_ahora_nacion_senadores.txt")
