import os
import psycopg2

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://admin:dev_password_2026@localhost:54333/candidatos_db")

sql = """
CREATE TABLE IF NOT EXISTS votos_segunda_vuelta (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(200) UNIQUE NOT NULL,
    candidato_id VARCHAR(10),
    candidato_nombre VARCHAR(200),
    votos_categorias JSONB,
    ip_address INET,
    user_agent TEXT,
    fecha_voto TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_votos_session ON votos_segunda_vuelta(session_id);
"""

try:
    print(f"Connecting to {DATABASE_URL}...")
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()
    cursor.close()
    conn.close()
    print("Tabla votos_segunda_vuelta creada correctamente.")
except Exception as e:
    print(f"Error: {e}")
