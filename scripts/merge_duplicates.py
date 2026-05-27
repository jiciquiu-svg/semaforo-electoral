import psycopg2, os
from dotenv import load_dotenv
load_dotenv('backend/.env')

conn = psycopg2.connect(os.getenv('DATABASE_URL'))
cur = conn.cursor()

# Map of mixed-case -> official uppercase
MERGE_MAP = {
    "Alianza para el Progreso": "ALIANZA PARA EL PROGRESO",
    "Fuerza Popular": "FUERZA POPULAR",
    "Fuerza y Libertad": "FUERZA Y LIBERTAD",
    "Libertad Popular": "LIBERTAD POPULAR",
    "Partido Morado": "PARTIDO MORADO",
    "Progresemos": "PROGRESEMOS",
    "Unidad Nacional": "UNIDAD NACIONAL",
    # Additional near-duplicates from discovery
    "Ahora Nación": "AHORA NACION - AN",
    "Alianza Venceremos": "ALIANZA ELECTORAL VENCEREMOS",
    "APRA": "PARTIDO APRISTA PERUANO",
    "Avanza País": "AVANZA PAIS - PARTIDO DE INTEGRACION SOCIAL",
    "Cooperación Popular": "PARTIDO POLITICO COOPERACION POPULAR",
    "Demócrata Verde": "PARTIDO DEMOCRATA VERDE",
    "Democrático Federal": "PARTIDO DEMOCRATICO FEDERAL",
    "Fe en el Perú": "FE EN EL PERU",
    "Frente de la Esperanza": "PARTIDO FRENTE DE LA ESPERANZA 2021",
    "Integridad Democrática": "PARTIDO POLITICO INTEGRIDAD DEMOCRATICA",
    "Juntos por el Perú": "JUNTOS POR EL PERU",
    "País para Todos": "PARTIDO PAIS PARA TODOS",
    "Perú Acción": "PARTIDO POLITICO PERU ACCION",
    "Perú Libre": "PARTIDO POLITICO NACIONAL PERU LIBRE",
    "Perú Moderno": "PERU MODERNO",
    "Perú Primero": "PARTIDO POLITICO PERU PRIMERO",
    "Podemos Perú": "PODEMOS PERU",
    "Primero la Gente": "PRIMERO LA GENTE - COMUNIDAD, ECOLOGIA, LIBERTAD Y PROGRESO",
    "PRIN": "PARTIDO POLITICO PRIN",
    "Renovación Popular": "RENOVACION POPULAR",
    "Salvemos al Perú": "SALVEMOS AL PERU",
    "SíCreo": "PARTIDO SICREO",
    "Somos Perú": "PARTIDO DEMOCRATICO SOMOS PERU",
    "Venceremos": "ALIANZA ELECTORAL VENCEREMOS",
}

print("=" * 70)
print("FUSIONANDO PARTIDOS DUPLICADOS")
print("=" * 70)

total_merged = 0
for old_name, new_name in MERGE_MAP.items():
    # Verify old exists
    cur.execute("SELECT COUNT(*) FROM candidatos WHERE partido = %s", (old_name,))
    count = cur.fetchone()[0]
    if count > 0:
        # Check for DNI conflicts (same DNI already in target partido)
        cur.execute("""
            SELECT c1.dni FROM candidatos c1
            WHERE c1.partido = %s
            AND EXISTS (SELECT 1 FROM candidatos c2 WHERE c2.dni = c1.dni AND c2.partido = %s)
        """, (old_name, new_name))
        conflicts = cur.fetchall()
        
        if conflicts:
            # Delete the duplicate (keep the one with more data = the official one)
            for (dni,) in conflicts:
                cur.execute("DELETE FROM candidatos WHERE dni = %s AND partido = %s", (dni, old_name))
                print(f"  🗑️  Eliminado duplicado DNI {dni} de '{old_name}'")
            
            # Update remaining (non-conflicting)
            cur.execute("UPDATE candidatos SET partido = %s WHERE partido = %s", (new_name, old_name))
            remaining = cur.rowcount
            if remaining > 0:
                print(f"  ✏️  Migrados {remaining} restantes de '{old_name}' -> '{new_name}'")
        else:
            cur.execute("UPDATE candidatos SET partido = %s WHERE partido = %s", (new_name, old_name))
            print(f"  ✅ '{old_name}' ({count}) -> '{new_name}'")
        
        total_merged += count

# Delete test record
cur.execute("DELETE FROM candidatos WHERE partido = 'Partido Test'")
test_deleted = cur.rowcount
if test_deleted:
    print(f"\n  🗑️  Eliminado registro de prueba 'Partido Test' ({test_deleted})")

conn.commit()

# Final stats
cur.execute("SELECT COUNT(DISTINCT partido) FROM candidatos")
final_parties = cur.fetchone()[0]
cur.execute("SELECT COUNT(*) FROM candidatos")
final_total = cur.fetchone()[0]

print(f"\n{'='*70}")
print(f"RESULTADO FINAL:")
print(f"  Candidatos fusionados/reasignados: {total_merged}")
print(f"  Registros de prueba eliminados: {test_deleted}")
print(f"  Partidos únicos ahora: {final_parties}")
print(f"  Total candidatos: {final_total}")
print(f"{'='*70}")

conn.close()
