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
    """Registra un nuevo voto"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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
        
        # Insertar voto
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
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"status": "ok", "message": "Voto registrado exitosamente"}
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error en registrar: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/estadisticas")
async def get_estadisticas():
    """Obtiene estadísticas de votación"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        # Total de votos
        cursor.execute("SELECT COUNT(*) as total FROM votos_segunda_vuelta")
        total = cursor.fetchone()
        
        # Votos por candidato
        cursor.execute("""
            SELECT 
                candidato_nombre,
                COUNT(*) as votos,
                ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM votos_segunda_vuelta), 2) as porcentaje
            FROM votos_segunda_vuelta
            GROUP BY candidato_nombre
            ORDER BY votos DESC
        """)
        por_candidato = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "total_votos": total['total'] if total else 0,
            "votos_por_candidato": por_candidato
        }
        
    except Exception as e:
        print(f"Error en estadisticas: {e}")
        return {"total_votos": 0, "votos_por_candidato": []}
