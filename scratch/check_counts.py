import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('backend/.env')

db_url = os.getenv("DATABASE_URL")
if "sslmode=" not in db_url:
    db_url += "&sslmode=require" if "?" in db_url else "?sslmode=require"

conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT count(*) FROM candidatos WHERE foto_url IS NULL AND partido NOT ILIKE '%AHORA NACION%' AND nombres_completos NOT ILIKE '%MIRTHA%VASQUEZ%';")
count = cur.fetchone()[0]
print(f"Candidates missing photos (excluding blocked): {count}")

cur.execute("SELECT count(*) FROM candidatos WHERE foto_url IS NULL AND (partido ILIKE '%AHORA NACION%' OR nombres_completos ILIKE '%MIRTHA%VASQUEZ%');")
blocked_count = cur.fetchone()[0]
print(f"Blocked candidates missing photos: {blocked_count}")

conn.close()
