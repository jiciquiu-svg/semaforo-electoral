import httpx
import asyncio

async def fetch_ubigeos():
    url = "https://web.jne.gob.pe/serviciovotoinformado/api/ubigeo/departamentos"
    headers = {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/json",
        "x-session-token": "35cb5eed-9f6c-4219-8245-5d133716ac10",
        "Origin": "https://votoinformado.jne.gob.pe",
        "Referer": "https://votoinformado.jne.gob.pe/"
    }
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            deps = response.json()
            print("--- DEPARTAMENTOS JNE ---")
            for d in deps:
                print(f"ID: {d.get('idUbigeo')} - Name: {d.get('txUbigeo')}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(fetch_ubigeos())
