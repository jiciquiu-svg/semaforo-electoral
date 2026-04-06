from fastapi import FastAPI, Depends, HTTPException
from datetime import datetime

media_api = FastAPI()


def verify_media_key(api_key: str):
    if api_key != "VALID_MEDIA_KEY":
        raise HTTPException(status_code=401, detail="API key inválida")
    return api_key


def get_total_queries():
    return 123456


def get_top_searched(limit: int):
    return [
        {"dni": "12345678", "nombre": "Ana María López García", "consultas": 12456},
        {"dni": "23456789", "nombre": "Carlos Alberto Mendoza Ríos", "consultas": 11234}
    ][:limit]


def get_hourly_trends():
    return [{"hora": "09:00", "consultas": 1532}, {"hora": "10:00", "consultas": 1840}]


def get_regional_heatmap():
    return [{"region": "Lima", "consultas": 50123}, {"region": "Arequipa", "consultas": 12345}]


@media_api.get("/media/resultados-rapidos")
async def resultados_rapidos(api_key: str = Depends(verify_media_key)):
    return {
        "timestamp": datetime.now().isoformat(),
        "total_consultas": get_total_queries(),
        "candidatos_mas_buscados": get_top_searched(50),
        "tendencias_por_hora": get_hourly_trends(),
        "mapa_calor_regiones": get_regional_heatmap()
    }


@media_api.get("/media/embed/{candidato_dni}")
async def embed_candidato(candidato_dni: str):
    return {
        "html": f"""
        <iframe 
            src=\"https://candidato.pe/embed/{candidato_dni}\"
            width=\"100%\"
            height=\"400\"
            frameborder=\"0\">
        </iframe>
        """,
        "javascript": f"""
        <script src=\"https://candidato.pe/widget.js\" 
                data-candidate=\"{candidato_dni}\">
        </script>
        """
    }
