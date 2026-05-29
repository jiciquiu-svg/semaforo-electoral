from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Dict, Optional
import json
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
import os

router = APIRouter(prefix="/api/segunda-vuelta", tags=["Segunda Vuelta"])

# Configuración de base de datos (desde variable de entorno)
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://admin:dev_password_2026@localhost:54333/candidatos_db")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

class VotoRequest(BaseModel):
    session_id: str
    candidato_id: str
    candidato_nombre: str
    votos_categorias: Dict

@router.post("/verificar")
async def verificar_voto(request: Request):
    """Verifica si un session_id ya votó"""
    try:
        body = await request.json()
        session_id = body.get('session_id')
        
        if not session_id:
            return {"yaVoto": False}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute(
            "SELECT 1 FROM votos_segunda_vuelta WHERE session_id = %s", 
            (session_id,)
        )
        existe = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        return {"yaVoto": existe is not None}
        
    except Exception as e:
        print(f"Error en verificar: {e}")
        return {"yaVoto": False}

@router.post("/registrar")
async def registrar_voto(request: Request, voto: VotoRequest):
    """Registra un nuevo voto y actualiza los resultados agregados"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Verificar que no exista
        cursor.execute(
            "SELECT 1 FROM votos_segunda_vuelta WHERE session_id = %s", 
            (voto.session_id,)
        )
        if cursor.fetchone():
            cursor.close()
            conn.close()
            raise HTTPException(status_code=400, detail="Ya has votado anteriormente")
        
        # Obtener IP y User-Agent
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get('user-agent', 'unknown')
        
        # 1. Insertar en log de votos para control de duplicados
        cursor.execute("""
            INSERT INTO votos_segunda_vuelta 
            (session_id, candidato_id, candidato_nombre, votos_categorias, ip_address, user_agent, fecha_voto)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            voto.session_id,
            voto.candidato_id,
            voto.candidato_nombre,
            json.dumps(voto.votos_categorias),
            client_ip,
            user_agent,
            datetime.now()
        ))
        
        # 2. Incrementar el voto en resultados_segunda_vuelta
        cursor.execute("""
            UPDATE resultados_segunda_vuelta
            SET votos = votos + 1, updated_at = NOW()
            WHERE candidato_id = %s
        """, (voto.candidato_id,))
        
        # 3. Calcular la suma total de todos los votos en resultados_segunda_vuelta
        cursor.execute("SELECT SUM(votos) as total FROM resultados_segunda_vuelta")
        total_row = cursor.fetchone()
        total_votos = int(total_row['total']) if total_row and total_row['total'] is not None else 1
        
        # 4. Recalcular los porcentajes de todas las opciones
        cursor.execute("""
            UPDATE resultados_segunda_vuelta
            SET porcentaje = ROUND(votos * 100.0 / %s, 3)
        """, (total_votos,))
        
        # 5. Obtener estadísticas actualizadas para responder
        cursor.execute("""
            SELECT candidato_id, candidato_nombre, votos, porcentaje
            FROM resultados_segunda_vuelta
            ORDER BY votos DESC
        """)
        por_candidato = cursor.fetchall()
        
        conn.commit()
        cursor.close()
        conn.close()
        
        for item in por_candidato:
            item['porcentaje'] = float(item['porcentaje']) if item['porcentaje'] is not None else 0.0
            
        return {
            "status": "ok",
            "message": "Voto registrado exitosamente",
            "estadisticas": {
                "total_votos": total_votos,
                "votos_por_candidato": por_candidato
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en registrar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas")
async def get_estadisticas():
    """Obtiene estadísticas de votación desde la tabla de resultados acumulados"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Obtener votos por candidato
        cursor.execute("""
            SELECT 
                candidato_id,
                candidato_nombre,
                votos,
                porcentaje
            FROM resultados_segunda_vuelta
            ORDER BY votos DESC
        """)
        por_candidato = cursor.fetchall()
        
        # Suma total
        cursor.execute("SELECT SUM(votos) as total FROM resultados_segunda_vuelta")
        total = cursor.fetchone()
        
        cursor.close()
        conn.close()
        
        for item in por_candidato:
            item['porcentaje'] = float(item['porcentaje']) if item['porcentaje'] is not None else 0.0
            
        return {
            "total_votos": int(total['total']) if total and total['total'] is not None else 0,
            "votos_por_candidato": por_candidato
        }
        
    except Exception as e:
        print(f"Error en estadisticas: {e}")
        return {"total_votos": 0, "votos_por_candidato": []}
