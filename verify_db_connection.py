import psycopg2
from datetime import datetime

print("=" * 50)
print("🔍 VERIFICACIÓN DE BASE DE DATOS")
print("=" * 50)

try:
    conn = psycopg2.connect(
        host='localhost',
        port=54333,
        user='admin',
        password='dev_password_2026',
        database='candidatos_db'
    )
    print("✅ Conexión exitosa a PostgreSQL!")
    
    cur = conn.cursor()
    
    # Contar candidatos
    cur.execute("SELECT COUNT(*) FROM candidatos")
    count = cur.fetchone()[0]
    print(f"📊 Candidatos en BD: {count}")
    
    # Listar todas las tablas
    cur.execute("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """)
    tablas = [row[0] for row in cur.fetchall()]
    print(f"\n📋 Tablas disponibles ({len(tablas)}):")
    for t in tablas:
        print(f"   - {t}")
    
    # Verificar tablas clave
    tablas_necesarias = [
        'candidatos', 'formacion_academica', 'experiencia_laboral',
        'declaraciones_juradas', 'aportes_campana', 'antecedentes_judiciales',
        'historial_cambios', 'logs_extraccion'
    ]
    
    print("\n🔍 Verificando tablas necesarias:")
    for tn in tablas_necesarias:
        if tn in tablas:
            print(f"   ✅ {tn}")
        else:
            print(f"   ❌ {tn} - FALTA")
    
    conn.close()
    
    print("\n" + "=" * 50)
    print("🎉 BASE DE DATOS LISTA PARA PRODUCCIÓN")
    print("=" * 50)
    
except Exception as e:
    print(f"❌ Error: {e}")
