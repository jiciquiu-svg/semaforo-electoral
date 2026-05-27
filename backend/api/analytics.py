from fastapi import APIRouter, HTTPException, Query
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter(prefix="/api/analytics", tags=["analytics"])

# Configuración de DB (reutilizada del env)
class EventoAnalytics(BaseModel):
    candidato_dni: str
    candidato_nombre: str
    partido: str
    tipo_visita: str
    session_id: Optional[str] = "anonimo"

# Configuración de DB dinámica
def get_db_conn():
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ ERROR: DATABASE_URL no encontrada en el entorno")
        return None
    try:
        return psycopg2.connect(db_url)
    except Exception as e:
        print(f"❌ ERROR de conexión: {e}")
        return None

@router.post("/registrar")
async def registrar_evento(evento: EventoAnalytics):
    conn = get_db_conn()
    if not conn:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    
    try:
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO analytics (candidato_dni, candidato_nombre, partido, tipo_visita, session_id, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            evento.candidato_dni, 
            evento.candidato_nombre, 
            evento.partido, 
            evento.tipo_visita, 
            evento.session_id, 
            datetime.now()
        ))
        conn.commit()
        cur.close()
        conn.close()
        return {"status": "success"}
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas")
async def obtener_estadisticas(horas: int = Query(24, ge=1, le=8760)):
    conn = get_db_conn()
    if not conn:
        raise HTTPException(status_code=503, detail="Base de datos no disponible")
    
    try:
        cur = conn.cursor(cursor_factory=RealDictCursor)
        fecha_limite = datetime.now() - timedelta(hours=horas)
        
        # 1. Resumen General
        cur.execute("""
            SELECT 
                COUNT(*) FILTER (WHERE tipo_visita = 'voto_final') as total_votos_finales,
                COUNT(*) FILTER (WHERE tipo_visita = 'voto_categoria') as total_votos_categorias,
                COUNT(*) FILTER (WHERE tipo_visita = 'ficha_abierta') as total_fichas_abiertas,
                COUNT(DISTINCT session_id) as total_sesiones
            FROM analytics
            WHERE created_at >= %s
        """, (fecha_limite,))
        resumen = cur.fetchone()
        
        # 2. Ranking de Candidatos (por votos finales o votos totales)
        cur.execute("""
            SELECT 
                candidato_dni,
                candidato_nombre,
                partido,
                COUNT(*) FILTER (WHERE tipo_visita = 'voto_final') as votos_ganados,
                COUNT(*) FILTER (WHERE tipo_visita = 'ficha_abierta') as fichas_abiertas,
                COUNT(*) as total_interacciones
            FROM analytics
            WHERE created_at >= %s
            GROUP BY candidato_dni, candidato_nombre, partido
            ORDER BY votos_ganados DESC
            LIMIT 20
        """, (fecha_limite,))
        ranking = cur.fetchall()
        
        cur.close()
        conn.close()
        
        return {
            "resumen_votacion": {
                "total_votos_simulados": resumen['total_votos_finales'],
                "total_fichas_abiertas": resumen['total_fichas_abiertas'],
                "total_comparativas": resumen['total_votos_categorias'],
                "total_usuarios": resumen['total_sesiones']
            },
            "ranking_candidatos": ranking,
            "periodo_horas": horas
        }
    except Exception as e:
        if conn: conn.close()
        raise HTTPException(status_code=500, detail=str(e))
