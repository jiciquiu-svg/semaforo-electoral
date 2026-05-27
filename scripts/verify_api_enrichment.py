import psycopg2
from psycopg2.extras import RealDictCursor
import os
from dotenv import load_dotenv
import json

# Cargar configuración desde backend/.env
load_dotenv(dotenv_path='backend/.env')

def test_perfil_rico(dni):
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        print("Error: DATABASE_URL no encontrada")
        return

    try:
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        print(f"--- Simulando API para DNI: {dni} ---")
        
        # 1. Datos básicos
        cursor.execute("SELECT * FROM candidatos WHERE dni = %s", (dni,))
        candidato = cursor.fetchone()
        
        if not candidato:
            print("Candidato no encontrado")
            return
            
        # 2. Formación Académica
        cursor.execute("""
            SELECT tipo, institucion, titulo, grado, anio_inicio, anio_fin, sunedu_registro, fuente 
            FROM formacion_academica 
            WHERE candidato_dni = %s 
            ORDER BY anio_fin DESC NULLS LAST
        """, (dni,))
        candidato['formacion'] = cursor.fetchall()
        
        # 3. Experiencia Laboral
        cursor.execute("""
            SELECT sector, institucion, cargo, fecha_inicio, fecha_fin, funciones, fuente 
            FROM experiencia_laboral 
            WHERE candidato_dni = %s 
            ORDER BY fecha_inicio DESC NULLS LAST
        """, (dni,))
        candidato['experiencia'] = cursor.fetchall()
        
        # 4. Declaraciones Juradas
        cursor.execute("""
            SELECT fecha_declaracion, patrimonio_total, ingresos_anuales, url_fuente, fecha_extraccion 
            FROM declaraciones_juradas 
            WHERE candidato_dni = %s 
            ORDER BY fecha_declaracion DESC NULLS LAST
        """, (dni,))
        candidato['declaraciones'] = cursor.fetchall()
        
        print("\n[RESULTADO JSON]")
        # Convertir fechas a string para serializar
        def default(o):
            if hasattr(o, 'isoformat'):
                return o.isoformat()
            return str(o)
            
        print(json.dumps(candidato, indent=2, default=default))
        
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_perfil_rico('00100001')
