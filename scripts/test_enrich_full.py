import asyncio
import os
import sys
from dotenv import load_dotenv

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.jne_client import jne_client
load_dotenv('backend/.env')

async def test_full_enrich(dni, url_hv):
    print(f"🧪 Probando enriquecimiento completo para DNI: {dni}")
    
    # 1. Obtener datos
    datos = await jne_client.enriquecer_candidato(dni, url_hv)
    
    print("\n--- RESULTADOS ---")
    print(f"Foto URL: {datos.get('foto_url')}")
    print(f"Ingresos: {datos.get('ingresos_total')}")
    print(f"Tiene Sentencias: {datos.get('tiene_sentencias')} ({datos.get('tipo_sentencia')})")
    print(f"Formación: {len(datos.get('formacion', []))} registros")
    print(f"Experiencia: {len(datos.get('experiencia', []))} registros")
    
    if datos.get('formacion'):
        print(f"Ejm Formación: {datos['formacion'][0]}")
    if datos.get('experiencia'):
        print(f"Ejm Experiencia: {datos['experiencia'][0]}")
    
    print("\n✅ Prueba completada.")

if __name__ == "__main__":
    # DNI de prueba de EG 2026 (Cesar Acuña)
    dni_test = "17903382" 
    url_test = "https://votoinformado.jne.gob.pe/hoja-vida/1257/17903382/245682"
    
    asyncio.run(test_full_enrich(dni_test, url_test))
