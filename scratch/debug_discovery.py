import asyncio
from playwright.async_api import async_playwright

async def debug_party():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()
        print("Navegando...")
        await page.goto("https://votoinformado.jne.gob.pe/senadores?partido=1366", wait_until="networkidle")
        await asyncio.sleep(5)
        content = await page.content()
        with open("party_debug.html", "w", encoding="utf-8") as f:
            f.write(content)
        print("HTML guardado en party_debug.html")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(debug_party())
