import asyncio
import os
import sys
from datetime import datetime

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.jne_client import jne_client
from main import get_db_connection

# TOKEN OBTENIDO POR SUBAGENTE O AMBIENTE
TOKEN = os.getenv("JNE_SESSION_TOKEN")

async def enrich_candidate_data_manual(dni: str, url_hoja_vida: str):
    """Vercion manual de la tarea de segundo plano para testing con token fresco"""
    print(f"🚀 [MANUAL] Enriqueciendo DNI: {dni}")
    
    # Configurar el token fresco
    jne_client.set_token(TOKEN)

    try:
        # 1. Obtener datos enriquecidos (API JSON)
        datos = await jne_client.enriquecer_candidato(dni, url_hoja_vida)
        
        if datos and datos.get("foto_url"):
            print(f"✅ Datos obtenidos para {dni}: {datos}")
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                cur.execute("""
                    UPDATE candidatos 
                    SET foto_url = %s,
                        url_hoja_vida = %s,
                        ingresos_total = %s,
                        tiene_sentencias = %s,
                        tipo_sentencia = %s,
                        detalle_sentencia = %s,
                        ultima_actualizacion = %s
                    WHERE dni = %s
                """, (
                    datos.get("foto_url"),
                    url_hoja_vida,
                    datos.get("ingresos_total", 0.0),
                    datos.get("tiene_sentencias", False),
                    datos.get("tipo_sentencia"),
                    datos.get("detalle_sentencias"),
                    datetime.now(),
                    dni
                ))
                conn.commit()
                cur.close()
                conn.close()
                print(f"🎉 Enriquecimiento manual completado para DNI {dni}")
            else:
                print("❌ No se pudo conectar a la base de datos")
        else:
            print(f"⚠️ No se pudo obtener informacion enriquecida para {dni}. Posible token expirado o ID HV incorrecto.")
            
    except Exception as e:
        print(f"❌ Error en enriquecimiento manual: {str(e)}")

async def run_test():
    # Keiko Fujimori como prueba principal
    await enrich_candidate_data_manual('10001088', 'https://votoinformado.jne.gob.pe/hoja-vida/2857/10001088/245741')
    
if __name__ == "__main__":
    asyncio.run(run_test())
