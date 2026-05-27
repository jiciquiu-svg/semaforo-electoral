import psycopg2
import os
from dotenv import load_dotenv

load_dotenv("backend/.env")

def normalize_database():
    conn = psycopg2.connect(os.getenv("DATABASE_URL"))
    cur = conn.cursor()

    print("Normalizando nombres de cargos...")
    # Normalización de cargos
    # Usamos %% para escapar el signo de porcentaje en psycopg2
    mappings = [
        ('presidente', "cargo_postula ILIKE 'presidente%%'"),
        ('senadores', "cargo_postula ILIKE 'senador%%'"),
        ('diputados', "cargo_postula ILIKE 'diputado%%'"),
        ('parlamento_andino', "cargo_postula ILIKE '%%parlamento%%andino%%'")
    ]

    for target, condition in mappings:
        query = f"UPDATE candidatos SET cargo_postula = %s WHERE {condition}"
        cur.execute(query, (target,))
        print(f"  {target}: {cur.rowcount} filas actualizadas")

    print("\nVerificando distribución final de cargos:")
    cur.execute("SELECT cargo_postula, COUNT(*) FROM candidatos GROUP BY cargo_postula ORDER BY 2 DESC")
    for cargo, count in cur.fetchall():
        print(f"  {cargo}: {count}")

    print("\nVerificando candidatos sin distrito_electoral:")
    cur.execute("UPDATE candidatos SET distrito_electoral = 'DISTRITO UNICO' WHERE distrito_electoral IS NULL")
    print(f"  Actualizados: {cur.rowcount}")

    conn.commit()
    cur.close()
    conn.close()
    print("\n✅ Normalización completada.")

if __name__ == "__main__":
    normalize_database()
