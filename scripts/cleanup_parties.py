import psycopg2, os
from dotenv import load_dotenv
load_dotenv('backend/.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# 1. Eliminar partido no oficial
cur.execute("DELETE FROM formacion_academica WHERE candidato_dni IN (SELECT dni FROM candidatos WHERE partido = 'PARTIDO CIUDADANOS POR EL PERU')")
print(f"Formacion eliminada: {cur.rowcount}")
cur.execute("DELETE FROM experiencia_laboral WHERE candidato_dni IN (SELECT dni FROM candidatos WHERE partido = 'PARTIDO CIUDADANOS POR EL PERU')")
print(f"Experiencia eliminada: {cur.rowcount}")
cur.execute("DELETE FROM sentencias WHERE candidato_dni IN (SELECT dni FROM candidatos WHERE partido = 'PARTIDO CIUDADANOS POR EL PERU')")
print(f"Sentencias eliminadas: {cur.rowcount}")
cur.execute("DELETE FROM declaraciones_juradas WHERE candidato_dni IN (SELECT dni FROM candidatos WHERE partido = 'PARTIDO CIUDADANOS POR EL PERU')")
print(f"Declaraciones eliminadas: {cur.rowcount}")
cur.execute("DELETE FROM candidatos WHERE partido = 'PARTIDO CIUDADANOS POR EL PERU'")
print(f"Candidatos eliminados: {cur.rowcount}")

conn.commit()

# 2. Verificar estado final
cur.execute("SELECT COUNT(DISTINCT partido) FROM candidatos")
print(f"\nPartidos finales: {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM candidatos")
print(f"Candidatos finales: {cur.fetchone()[0]}")

conn.close()
