import psycopg2
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')

def verify():
    dni = '10001088'
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()
    cur.execute("SELECT dni, nombres_completos, foto_url, ingresos_total, tiene_sentencias FROM candidatos WHERE dni = %s", (dni,))
    row = cur.fetchone()
    if row:
        print(f"Results for {dni}:")
        print(f"  Name: {row[1]}")
        print(f"  Photo: {row[2]}")
        print(f"  Income: {row[3]}")
        print(f"  Sentences: {row[4]}")
    else:
        print(f"No results found for DNI {dni}")
    conn.close()

if __name__ == "__main__":
    verify()
