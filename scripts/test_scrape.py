import asyncio
import sys
import os

# Asegurar que el path incluya el backend
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.jne_client import jne_client

async def test():
    url = "https://votoinformado.jne.gob.pe/hoja-vida/2857/10001088/245741"
    print(f"Testing URL: {url}")
    html = await jne_client.fetch_html(url)
    if not html:
        print("Failed to fetch HTML")
        return
        
    data = jne_client.parse_hoja_vida(html)
    print("Parsed Data:")
    for k, v in data.items():
        print(f"  {k}: {v}")

if __name__ == "__main__":
    asyncio.run(test())
