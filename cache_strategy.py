import json

CACHE_CONFIG = {
    "edge": {
        "ttl": 86400,
        "invalidation": "manual",
        "items": [
            "perfiles_candidatos/*",
            "imagenes/*",
            "css/*",
            "js/*"
        ]
    },
    "redis": {
        "ttl": 3600,
        "max_memory": "500GB",
        "items": [
            "buscadores_frecuentes",
            "comparativas_populares",
            "estadisticas_tiempo_real"
        ]
    },
    "database": {
        "read_replicas": 10,
        "write_replicas": 1,
        "items": [
            "actualizaciones_en_vivo",
            "votos_ciudadanos",
            "logs_auditoria"
        ]
    }
}


def get_most_searched_candidates(limit: int):
    # Placeholder: implementar consulta real
    return []


def generate_static_profile(candidate):
    # Placeholder: generar HTML estático de candidato
    return f"/static/{candidate.dni}.html"


def precompute_comparison(candidate_a, candidate_b):
    # Placeholder: pre-calcular una comparación común
    return {
        "candidate_a": candidate_a.dni,
        "candidate_b": candidate_b.dni,
    }


def prewarm_cache(redis_client):
    """Carga los perfiles más populares antes del día D"""
    top_candidates = get_most_searched_candidates(1000)

    for candidate in top_candidates:
        generate_static_profile(candidate)
        redis_client.setex(
            f"candidate:{candidate.dni}",
            86400,
            json.dumps(candidate.to_dict())
        )

        for other in top_candidates[:100]:
            precompute_comparison(candidate, other)
