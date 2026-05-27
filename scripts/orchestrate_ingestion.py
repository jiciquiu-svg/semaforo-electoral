import asyncio
import os
import sys
import httpx
from dotenv import load_dotenv

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.discovery_service import DiscoveryService

load_dotenv('backend/.env')

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8001/api")

async def orchestrate(batch_size=10):
    print("🚦 Iniciando Orquestador de Ingesta Electoral 2026")
    
    token = os.getenv("JNE_SESSION_TOKEN")
    if not token:
        print("❌ Error: JNE_SESSION_TOKEN no configurado en .env")
        return

    discovery = DiscoveryService(session_token=token)
    
    # 1. Descubrimiento de candidatos (Categorías principales)
    print("🔍 Descubriendo candidatos...")
    try:
        candidates = await discovery.discover_all()
        print(f"✅ Se encontraron {len(candidates)} candidatos en total.")
    except Exception as e:
        print(f"❌ Error en descubrimiento: {e}")
        return

    # 2. Ingesta a través de la API
    print(f"📥 Cargando lote de prueba (batch_size={batch_size})...")
    
    count = 0
    async with httpx.AsyncClient(timeout=30.0) as client:
        for c in candidates[:batch_size]:
            payload = {
                "dni": c.get("dni"),
                "nombres_completos": c.get("nombre_completo"),
                "partido": c.get("partido"),
                "cargo_postula": c.get("cargo_postula") or "Presidente",
                "url_hoja_vida": c.get("url_hoja_vida")
            }
            
            try:
                print(f"➡️ Registrando {payload['nombres_completos']}...")
                response = await client.post(f"{API_BASE_URL}/candidatos", json=payload)
                if response.status_code in [200, 201]:
                    print(f"  ✅ OK")
                    count += 1
                else:
                    print(f"  ⚠️ Error {response.status_code}: {response.text}")
            except Exception as e:
                print(f"  ❌ Error de conexión: {e}")
            
            # Pequeña pausa para no saturar
            await asyncio.sleep(1.0)

    print(f"🏁 Orquestación completada. {count} candidatos registrados.")
    print("💡 El enriquecimiento se está ejecutando en segundo plano en el backend.")

if __name__ == "__main__":
    asyncio.run(orchestrate(batch_size=5))
