import psycopg2
import os
import json
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def check_stats():
    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cur = conn.cursor()

        print("📊 ESTADÍSTICAS DE INGESTA Y ENRIQUECIMIENTO 📊")
        print("-" * 40)

        # 1. Total candidatos
        cur.execute("SELECT COUNT(*) FROM candidatos")
        total_candidatos = cur.fetchone()[0]
        print(f"Total Candidatos: {total_candidatos}")

        # 2. Candidatos con foto
        cur.execute("SELECT COUNT(*) FROM candidatos WHERE foto_url IS NOT NULL AND foto_url != ''")
        con_foto = cur.fetchone()[0]
        print(f"Con Foto: {con_foto}")

        # 3. Formación Académica
        cur.execute("SELECT COUNT(DISTINCT candidato_dni) FROM formacion_academica")
        con_formacion = cur.fetchone()[0]
        print(f"Con Formación: {con_formacion}")

        # 4. Experiencia Laboral
        cur.execute("SELECT COUNT(DISTINCT candidato_dni) FROM experiencia_laboral")
        con_experiencia = cur.fetchone()[0]
        print(f"Con Experiencia: {con_experiencia}")

        # 5. Declaraciones Juradas (Ingresos/Sentencias)
        cur.execute("SELECT COUNT(DISTINCT candidato_dni) FROM declaraciones_juradas")
        con_declaraciones = cur.fetchone()[0]
        print(f"Con Ingresos: {con_declaraciones}")

        # 6. Antecedentes/Sentencias
        cur.execute("SELECT COUNT(DISTINCT candidato_dni) FROM sentencias")
        con_antecedentes = cur.fetchone()[0]
        print(f"Con Sentencias: {con_antecedentes}")

        print("-" * 40)
        
        # Pendientes en la lista de descubrimiento
        cur.execute("SELECT COUNT(*) FROM pendientes_validacion")
        pendientes = cur.fetchone()[0]
        print(f"Pendientes de procesamiento (discovery): {pendientes}")

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_stats()
