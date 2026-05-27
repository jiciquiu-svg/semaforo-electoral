import asyncio
import os
import sys
from dotenv import load_dotenv

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.discovery_service import DiscoveryService
load_dotenv('backend/.env')

async def test_discovery():
    print("🔭 Probando descubrimiento de Presidentes (EG 2026)...")
    service = DiscoveryService()
    # 1 representa Presidentes
    candidatos = await service.descubrir_desde_api("PRESIDENTES", 1, "")
    
    if candidatos:
        print(f"✅ ¡Éxito! Se encontraron {len(candidatos)} candidatos presidenciales.")
        print(f"Ejemplo: {candidatos[0]['nombre_completo']} - {candidatos[0]['partido']}")
    else:
        print("❌ No se encontraron candidatos o hubo un error de autenticación.")

if __name__ == "__main__":
    asyncio.run(test_discovery())
