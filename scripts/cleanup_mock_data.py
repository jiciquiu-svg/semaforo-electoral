import psycopg2
import os
from dotenv import load_dotenv

load_dotenv(dotenv_path='backend/.env')

def cleanup():
    try:
        url = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(url)
        cur = conn.cursor()

        print("--- INICIANDO LIMPIEZA DE DATOS MOCK ---")

        # 1. Eliminar formación académica de prueba (PUCP - Abogado - 2010)
        cur.execute("""
            DELETE FROM formacion_academica 
            WHERE institucion = 'PUCP' AND titulo = 'Abogado' AND anio_fin = 2010
        """)
        count_edu = cur.rowcount
        print(f"✅ Se eliminaron {count_edu} registros de formación académica (MOCK).")

        # 2. Eliminar experiencia laboral de prueba (MEF - Ministro - 2020-2022)
        cur.execute("""
            DELETE FROM experiencia_laboral 
            WHERE institucion = 'MEF' AND cargo = 'Ministro' AND (fecha_inicio = '2020' OR fecha_fin = '2022')
        """)
        count_exp = cur.rowcount
        print(f"✅ Se eliminaron {count_exp} registros de experiencia laboral (MOCK).")

        # 3. Eliminar logs de extracción asociados (opcional, para limpiar historial corrupto)
        cur.execute("DELETE FROM logs_extraccion WHERE estado = 'exito' AND mensaje IS NULL")
        count_logs = cur.rowcount
        print(f"✅ Se eliminaron {count_logs} logs de extracción redundantes.")

        # 4. Resetear foto_url si sospechamos de duplicados masivos (opcional, pero mejor ser precavidos)
        # Solo reseteamos si sospechamos que una URL de placeholder se guardó como real.
        # Por ahora dejamos las fotos, pero las validaremos en el siguiente paso.

        conn.commit()
        print("\n--- LIMPIEZA COMPLETADA ---")
        conn.close()
    except Exception as e:
        print(f"❌ Error durante la limpieza: {e}")

if __name__ == "__main__":
    cleanup()
