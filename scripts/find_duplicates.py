import psycopg2, os
from collections import defaultdict
from dotenv import load_dotenv
load_dotenv('backend/.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("""
    SELECT partido, COUNT(*) as total
    FROM candidatos
    GROUP BY partido
    ORDER BY UPPER(partido), partido
""")
rows = cur.fetchall()

groups = defaultdict(list)
for partido, total in rows:
    groups[partido.upper()].append((partido, total))

with open('duplicados_report.txt', 'w', encoding='utf-8') as f:
    f.write('DUPLICADOS DETECTADOS:\n')
    f.write('='*70 + '\n')
    dup_count = 0
    for key, entries in sorted(groups.items()):
        if len(entries) > 1:
            dup_count += 1
            canonical = max(entries, key=lambda e: e[1])
            f.write(f'\nGRUPO {dup_count}: {key}\n')
            for name, count in entries:
                marker = ' <-- MANTENER' if name == canonical[0] else ' <-- FUSIONAR'
                f.write(f'  -> "{name}" ({count} candidatos){marker}\n')

    f.write(f'\n{"="*70}\n')
    f.write(f'Total grupos duplicados: {dup_count}\n')

    cur.execute("SELECT dni, nombres_completos, partido FROM candidatos WHERE partido = 'Partido Test'")
    test = cur.fetchall()
    if test:
        f.write(f'\nRegistro de prueba a eliminar:\n')
        for dni, nombre, partido in test:
            f.write(f'  DNI: {dni}, Nombre: {nombre}, Partido: {partido}\n')

conn.close()
print('Reporte generado en: duplicados_report.txt')
