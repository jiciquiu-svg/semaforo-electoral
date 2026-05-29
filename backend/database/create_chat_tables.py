# backend/database/create_chat_tables.py
import os
import psycopg2
from dotenv import load_dotenv

# Cargar variables de entorno del backend
load_dotenv('backend/.env')
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("❌ ERROR: DATABASE_URL no encontrada en las variables de entorno.")
    exit(1)

print(f"Conectando a base de datos...")

sql = """
-- ============================================
-- CHAT EN VIVO PARA SEGUNDA VUELTA
-- ============================================

-- 1. Tabla de comentarios
CREATE TABLE IF NOT EXISTS comentarios_votacion (
    id BIGSERIAL PRIMARY KEY,
    usuario_nombre VARCHAR(100) DEFAULT 'Anónimo',
    usuario_avatar VARCHAR(50) DEFAULT '👤',
    comentario TEXT NOT NULL,
    votacion_id VARCHAR(50) DEFAULT 'segunda-vuelta',
    likes INTEGER DEFAULT 0,
    parent_id INTEGER,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_comentarios_votacion ON comentarios_votacion(votacion_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comentarios_created ON comentarios_votacion(created_at DESC);

-- 3. Tabla de usuarios activos
CREATE TABLE IF NOT EXISTS usuarios_activos_chat (
    session_id VARCHAR(200) PRIMARY KEY,
    usuario_nombre VARCHAR(100),
    ultima_actividad TIMESTAMPTZ DEFAULT NOW()
);
"""

try:
    conn = psycopg2.connect(DATABASE_URL)
    cursor = conn.cursor()
    cursor.execute(sql)
    conn.commit()
    print("✅ Tablas comentarios_votacion y usuarios_activos_chat creadas correctamente.")
    
    # Verificar
    cursor.execute("SELECT 'comentarios_votacion' as tabla, COUNT(*) as registros FROM comentarios_votacion")
    print(f"Registros en comentarios_votacion: {cursor.fetchone()[1]}")
    
    cursor.execute("SELECT 'usuarios_activos_chat' as tabla, COUNT(*) as registros FROM usuarios_activos_chat")
    print(f"Registros en usuarios_activos_chat: {cursor.fetchone()[1]}")
    
    cursor.close()
    conn.close()
    print("🎉 Proceso finalizado.")
except Exception as e:
    print(f"❌ Error al crear las tablas: {e}")
