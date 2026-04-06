"""
API Routes - Endpoints para la plataforma
"""

from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from datetime import datetime

from models.candidato import ResultadoClasificacion, CandidatoCompleto
from services.clasificador import clasificador
from services.notebooklm_integration import notebooklm_service
from database.supabase_client import supabase

router = APIRouter(prefix="/api", tags=["candidatos"])


@router.get("/candidatos", response_model=List[ResultadoClasificacion])
async def listar_candidatos(
    partido: Optional[str] = Query(None, description="Filtrar por partido"),
    region: Optional[str] = Query(None, description="Filtrar por región"),
    cargo: Optional[str] = Query(None, description="Filtrar por cargo"),
    nivel: Optional[str] = Query(None, description="Filtrar por nivel (verde/amarillo/naranja/rojo)"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0)
):
    """
    Lista candidatos con filtros opcionales
    """
    # Consulta a Supabase
    query = supabase.table("candidatos").select("*")
    
    if partido:
        query = query.eq("partido", partido)
    if region:
        query = query.eq("region_postula", region)
    if cargo:
        query = query.eq("cargo_postula", cargo)
    if nivel:
        query = query.eq("nivel_criticidad", nivel)
    
    result = query.range(offset, offset + limit - 1).execute()
    
    # Convertir a ResultadoClasificacion
    candidatos = []
    for row in result.data:
        candidatos.append(ResultadoClasificacion(
            dni=row["dni"],
            nombres=row["nombres"],
            partido=row["partido"],
            cargo_postula=row["cargo_postula"],
            nivel=row["nivel_criticidad"],
            color=row["color"],
            subcategoria=row["subcategoria"],
            mensaje=row["mensaje_ciudadano"],
            inhabilitado=row.get("inhabilitado", False),
            alertas=row.get("alertas", []),
            puntaje_transparencia=row.get("puntaje_transparencia"),
            fuentes=row.get("fuentes", []),
            ultima_actualizacion=row["ultima_actualizacion"]
        ))
    
    return candidatos


@router.get("/candidatos/{dni}", response_model=ResultadoClasificacion)
async def obtener_candidato(dni: str):
    """
    Obtiene un candidato específico por DNI
    """
    result = supabase.table("candidatos").select("*").eq("dni", dni).execute()
    
    if not result.data:
        raise HTTPException(status_code=404, detail="Candidato no encontrado")
    
    row = result.data[0]
    
    return ResultadoClasificacion(
        dni=row["dni"],
        nombres=row["nombres"],
        partido=row["partido"],
        cargo_postula=row["cargo_postula"],
        nivel=row["nivel_criticidad"],
        color=row["color"],
        subcategoria=row["subcategoria"],
        mensaje=row["mensaje_ciudadano"],
        inhabilitado=row.get("inhabilitado", False),
        alertas=row.get("alertas", []),
        puntaje_transparencia=row.get("puntaje_transparencia"),
        fuentes=row.get("fuentes", []),
        ultima_actualizacion=row["ultima_actualizacion"]
    )


@router.post("/candidatos/procesar")
async def procesar_candidato(dni: str, nombre: str):
    """
    Procesa un candidato desde NotebookLM y lo guarda en BD
    """
    # Extraer datos con NotebookLM
    candidato = await notebooklm_service.extraer_candidato(dni, nombre)
    
    if not candidato:
        raise HTTPException(status_code=400, detail="No se pudieron extraer los datos")
    
    # Clasificar automáticamente
    resultado = clasificador.clasificar(candidato)
    
    # Guardar en Supabase
    data = {
        "dni": candidato.biograficos.dni,
        "nombres": candidato.biograficos.nombres_completos,
        "partido": candidato.biograficos.partido,
        "cargo_postula": candidato.biograficos.cargo_postula,
        "region_postula": candidato.biograficos.region_postula,
        "nivel_criticidad": resultado.nivel.value,
        "color": resultado.color,
        "subcategoria": resultado.subcategoria.value,
        "mensaje_ciudadano": resultado.mensaje,
        "inhabilitado": resultado.inhabilitado,
        "alertas": resultado.alertas,
        "puntaje_transparencia": resultado.puntaje_transparencia,
        "fuentes": resultado.fuentes,
        "ultima_actualizacion": datetime.now().isoformat(),
        "datos_completos": candidato.dict()  # JSON completo
    }
    
    supabase.table("candidatos").upsert(data).execute()
    
    return {"status": "success", "message": "Candidato procesado", "resultado": resultado.dict()}


@router.get("/estadisticas")
async def obtener_estadisticas():
    """
    Obtiene estadísticas agregadas por nivel y partido
    """
    # Contar por nivel
    niveles = supabase.table("candidatos").select("nivel_criticidad").execute()
    
    conteo_niveles = {}
    for row in niveles.data:
        nivel = row["nivel_criticidad"]
        conteo_niveles[nivel] = conteo_niveles.get(nivel, 0) + 1
    
    # Contar por partido
    partidos = supabase.table("candidatos").select("partido, nivel_criticidad").execute()
    
    stats_partidos = {}
    for row in partidos.data:
        partido = row["partido"]
        if partido not in stats_partidos:
            stats_partidos[partido] = {"total": 0, "verde": 0, "amarillo": 0, "naranja": 0, "rojo": 0}
        stats_partidos[partido]["total"] += 1
        stats_partidos[partido][row["nivel_criticidad"]] += 1
    
    return {
        "total_candidatos": len(niveles.data),
        "conteo_por_nivel": conteo_niveles,
        "estadisticas_por_partido": stats_partidos
    }


@router.get("/comparar")
async def comparar_candidatos(
    dni1: str = Query(..., description="Primer candidato"),
    dni2: str = Query(..., description="Segundo candidato")
):
    """
    Compara dos candidatos lado a lado
    """
    result1 = supabase.table("candidatos").select("*").eq("dni", dni1).execute()
    result2 = supabase.table("candidatos").select("*").eq("dni", dni2).execute()
    
    if not result1.data or not result2.data:
        raise HTTPException(status_code=404, detail="Uno o ambos candidatos no encontrados")
    
    return {
        "candidato_1": result1.data[0],
        "candidato_2": result2.data[0]
    }


@router.get("/buscar")
async def buscar_candidatos(
    q: str = Query(..., min_length=2, description="Término de búsqueda"),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Búsqueda por nombre, partido o DNI
    """
    # Búsqueda en Algolia (o Supabase como fallback)
    # Por ahora, búsqueda simple en Supabase
    result = supabase.table("candidatos").select("*").ilike("nombres", f"%{q}%").limit(limit).execute()
    
    if not result.data:
        result = supabase.table("candidatos").select("*").ilike("partido", f"%{q}%").limit(limit).execute()
    
    if not result.data and q.isdigit():
        result = supabase.table("candidatos").select("*").eq("dni", q).execute()
    
    return result.data