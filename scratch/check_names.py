import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")
if "sslmode=" not in db_url:
    db_url += "&sslmode=require" if "?" in db_url else "?sslmode=require"

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT nombres_completos, partido FROM candidatos WHERE nombres_completos ILIKE '%Mirtha%V%squez%' OR partido = 'Ahora Nación' LIMIT 10;")
rows = cur.fetchall()
for row in rows:
    print(f"Name: {row[0]}, Party: {row[1]}")

conn.close()
