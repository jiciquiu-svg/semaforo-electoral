import asyncio
import os
import sys
from dotenv import load_dotenv

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.discovery_service import DiscoveryService
load_dotenv('backend/.env')

async def main():
    print("🚀 Iniciando descubrimiento masivo de candidatos (EG 2026)...")
    service = DiscoveryService()
    
    # discover_all iterará sobre Presidentes, Senadores, Parlamento Andino y 25 Departamentos de Diputados
    candidatos = await service.discover_all()
    
    print(f"\n✅ Descubrimiento finalizado.")
    print(f"📊 Total candidatos encontrados y procesados: {len(candidatos)}")

if __name__ == "__main__":
    asyncio.run(main())
