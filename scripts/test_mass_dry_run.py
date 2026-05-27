import asyncio
from scripts.mass_enricher import MassEnricher

async def dry_run():
    print("🧪 Iniciando DRY RUN de 5 candidatos...")
    enricher = MassEnricher(concurrency=2)
    await enricher.run_mass_enrichment(limit=5)
    print("✅ DRY RUN FINALIZADO.")

if __name__ == "__main__":
    asyncio.run(dry_run())
