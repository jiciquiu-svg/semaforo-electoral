import psycopg2, os
from dotenv import load_dotenv
load_dotenv('backend/.env')

# 37 organizaciones oficiales del JNE (extraídas de la imagen)
OFICIAL_37 = [
    "AHORA NACION - AN",
    "ALIANZA ELECTORAL VENCEREMOS",
    "ALIANZA PARA EL PROGRESO",
    "AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL",
    "FE EN EL PERU",
    "FUERZA POPULAR",
    "FUERZA Y LIBERTAD",
    "JUNTOS POR EL PERU",
    "LIBERTAD POPULAR",
    "PARTIDO APRISTA PERUANO",
    "PARTIDO CIVICO OBRAS",
    "PARTIDO DE LOS TRABAJADORES Y EMPRENDEDORES PTE - PERU",
    "PARTIDO DEL BUEN GOBIERNO",
    "PARTIDO DEMOCRATA UNIDO PERU",
    "PARTIDO DEMOCRATA VERDE",
    "PARTIDO DEMOCRATICO FEDERAL",
    "PARTIDO DEMOCRATICO SOMOS PERU",
    "PARTIDO FRENTE DE LA ESPERANZA 2021",
    "PARTIDO MORADO",
    "PARTIDO PAIS PARA TODOS",
    "PARTIDO PATRIOTICO DEL PERU",
    "PARTIDO POLITICO COOPERACION POPULAR",
    "PARTIDO POLITICO INTEGRIDAD DEMOCRATICA",
    "PARTIDO POLITICO NACIONAL PERU LIBRE",
    "PARTIDO POLITICO PERU ACCION",
    "PARTIDO POLITICO PERU PRIMERO",
    "PARTIDO POLITICO PRIN",
    "PARTIDO SICREO",
    "PERU MODERNO",
    "PODEMOS PERU",
    "PRIMERO LA GENTE - COMUNIDAD, ECOLOGIA, LIBERTAD Y PROGRESO",
    "PROGRESEMOS",
    "RENOVACION POPULAR",
    "SALVEMOS AL PERU",
    "UN CAMINO DIFERENTE",
    "UNIDAD NACIONAL",
    "FRENTE POPULAR AGRICOLA FIA DEL PERU",
]

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

cur.execute("SELECT partido, COUNT(*) FROM candidatos GROUP BY partido ORDER BY partido")
db_parties = {row[0]: row[1] for row in cur.fetchall()}

with open('comparacion_final.txt', 'w', encoding='utf-8') as f:
    f.write("COMPARACIÓN FINAL: DB vs JNE OFICIAL (37 organizaciones)\n")
    f.write("=" * 80 + "\n\n")

    # Match
    f.write(f"{'#':>3} | {'PARTIDO JNE OFICIAL':<60} | {'EN DB':>6}\n")
    f.write("-" * 80 + "\n")
    found = 0
    missing = []
    for i, partido in enumerate(OFICIAL_37, 1):
        if partido in db_parties:
            found += 1
            f.write(f"{i:3d} | {partido:<60} | {db_parties[partido]:>5} ✅\n")
        else:
            missing.append(partido)
            f.write(f"{i:3d} | {partido:<60} | {'N/A':>5} ❌\n")
    
    f.write("-" * 80 + "\n")
    f.write(f"Encontrados: {found}/37\n\n")

    # Extras
    extras = [p for p in db_parties if p not in OFICIAL_37]
    if extras:
        f.write("⚠️ PARTIDOS EN DB QUE NO ESTÁN EN LAS 37 OFICIALES:\n")
        for p in extras:
            f.write(f"  - \"{p}\" ({db_parties[p]} candidatos)\n")
        
        # Investigar estos partidos
        for p in extras:
            cur.execute("SELECT cargo_postula, COUNT(*) FROM candidatos WHERE partido = %s GROUP BY cargo_postula", (p,))
            cargos = cur.fetchall()
            f.write(f"\n  Detalle \"{p}\":\n")
            for cargo, cnt in cargos:
                f.write(f"    {cargo}: {cnt}\n")

    f.write(f"\n{'='*80}\n")
    f.write(f"TOTAL DB: {len(db_parties)} partidos, {sum(db_parties.values())} candidatos\n")
    f.write(f"TOTAL JNE: 37 organizaciones\n")
    f.write(f"COINCIDENCIA: {found}/37\n")

conn.close()
print("Comparación final generada: comparacion_final.txt")
