import json
import os
import sys
import httpx
import asyncio
from dotenv import load_dotenv

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

load_dotenv('backend/.env')

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001/api")

async def ingest_from_file(file_path):
    if not os.path.exists(file_path):
        print(f"❌ Error: No se encuentra el archivo {file_path}")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    print(f"🚀 Iniciando ingesta masiva de {len(data)} candidatos...")
    
    count = 0
    errors = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        for item in data:
            dni = item.get("dni")
            # El subagente entrega {dni, nombre, partido, id_hv, tipo}
            payload = {
                "dni": dni,
                "nombres_completos": item.get("nombre"),
                "partido": item.get("partido"),
                "cargo_postula": get_cargo(item.get("tipo")),
                "url_hoja_vida": f"https://votoinformado.jne.gob.pe/hoja-vida/2857/{dni}/{item.get('id_hv')}"
            }
            
            try:
                # El endpoint /api/candidatos se encarga de:
                # 1. Guardar en DB (Supabase)
                # 2. Disparar enriquecimiento en segundo plano (fotos, sentencias, ingresos)
                response = await client.post(f"{API_BASE_URL}/candidatos", json=payload)
                if response.status_code in [200, 201]:
                    print(f"✅ [{count+1}/{len(data)}] {payload['nombres_completos']} - OK")
                    count += 1
                else:
                    print(f"⚠️ Error {response.status_code} para {dni}: {response.text}")
                    errors += 1
            except Exception as e:
                print(f"❌ Error de conexion para {dni}: {e}")
                errors += 1
            
            # Respetar el Rate Limit del JNE (1.5s por candidato en el backend)
            # Aqui podemos ir un poco mas rapido si el backend gestiona la cola,
            # pero para seguridad vamos a 1s de pausa.
            await asyncio.sleep(1.0)

    print(f"🏁 Ingesta completada.")
    print(f"📊 Resumen: {count} exitosos, {errors} errores.")
    print("💡 El enriquecimiento esta corriendo en segundo plano en el backend.")

def get_cargo(tipo):
    mapping = {1: "Presidente", 20: "Senador", 3: "Parlamento Andino"}
    return mapping.get(tipo, "Candidato")

if __name__ == "__main__":
    import sys
    path = sys.argv[1] if len(sys.argv) > 1 else "data/master_list.json"
    asyncio.run(ingest_from_file(path))
