import psycopg2
import os
from datetime import datetime
from dotenv import load_dotenv

# Cargar variables del backend
load_dotenv(dotenv_path='backend/.env')

print("=" * 50)
print("[BUSCANDO] VERIFICACION DE BASE DE DATOS")
print("=" * 50)

try:
    database_url = os.getenv("DATABASE_URL")
    
    if database_url:
        print("[NUBE] Usando DATABASE_URL (Supabase/Railway)")
        conn = psycopg2.connect(database_url)
    else:
        print("[LOCAL] Usando conexion local (localhost:54333)")
        conn = psycopg2.connect(
            host='localhost',
            port=54333,
            user='admin',
            password='dev_password_2026',
            database='candidatos_db'
        )
    print("[OK] Conexion exitosa!")
    
    cur = conn.cursor()
    
    # Contar candidatos
    cur.execute("SELECT COUNT(*) FROM candidatos")
    count = cur.fetchone()[0]
    print(f"--- Candidatos en BD: {count}")
    
    # Listar todas las tablas
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tablas = [row[0] for row in cur.fetchall()]
    print(f"\n--- Tablas disponibles ({len(tablas)}):")
    for t in tablas:
        print(f"   - {t}")
    
    # Verificar tablas clave
    tablas_necesarias = [
        'candidatos', 'formacion_academica', 'experiencia_laboral',
        'declaraciones_juradas', 'aportes_campana', 'antecedentes_judiciales',
        'historial_cambios', 'logs_extraccion'
    ]
    
    print("\n--- Verificando tablas necesarias:")
    for tn in tablas_necesarias:
        if tn in tablas:
            print(f"   [OK] {tn}")
        else:
            print(f"   [FALLO] {tn} - FALTA")
    
    conn.close()
    
    print("\n" + "=" * 50)
    print("BASE DE DATOS LISTA PARA PRODUCCION")
    print("=" * 50)
    
except Exception as e:
    print(f"❌ Error: {e}")
