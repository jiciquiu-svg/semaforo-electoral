import asyncio
import os
import json
from backend.services.jne_client import JNEClient

async def debug_candidate(id_hv):
    client = JNEClient()
    await client._refresh_token()
    
    print(f"--- Debugging ID HV: {id_hv} ---")
    
    endpoints = [
        "hojavida-principal",
        "ingresosvoto",
        "sentenciapenal",
        "sentenciaobliga",
        "bienerentavoto",
        "bienesmueblesvoto",
        "bienesinmueblesvoto"
    ]
    
    for ep in endpoints:
        print(f"\n[ENDPOINT: {ep}]")
        res = await client._api_get(ep, {"IdHojaVida": id_hv})
        print(json.dumps(res, indent=2))

if __name__ == "__main__":
    # Trying the ID from the URL
    asyncio.run(debug_candidate("244365"))
