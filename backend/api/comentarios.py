# backend/api/comentarios.py
from fastapi import APIRouter, Request, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import json
import psycopg2
from psycopg2.extras import RealDictCursor
import os

router = APIRouter(prefix="/api/comentarios", tags=["Comentarios"])

DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://admin:dev_password_2026@localhost:54333/candidatos_db")

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

class ComentarioEnviar(BaseModel):
    usuario_nombre: str
    comentario: str
    votacion_id: Optional[str] = "segunda-vuelta"

class ComentarioResponse(BaseModel):
    id: int
    usuario_nombre: str
    usuario_avatar: str
    comentario: str
    likes: int
    created_at: str

@router.post("/enviar")
async def enviar_comentario(request: Request, data: ComentarioEnviar):
    """Envía un nuevo comentario"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Obtener IP y User-Agent
        client_ip = request.client.host if request.client else "unknown"
        user_agent = request.headers.get('user-agent', 'unknown')
        
        cursor.execute("""
            INSERT INTO comentarios_votacion 
            (usuario_nombre, comentario, votacion_id, ip_address, user_agent, created_at)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id
        """, (
            data.usuario_nombre[:50] if data.usuario_nombre else "Anónimo",
            data.comentario[:500],
            data.votacion_id,
            client_ip,
            user_agent,
            datetime.now()
        ))
        
        nuevo_id = cursor.fetchone()[0]
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            "status": "ok", 
            "message": "Comentario enviado",
            "id": nuevo_id
        }
        
    except Exception as e:
        print(f"Error enviando comentario: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/listar")
async def listar_comentarios(votacion_id: str = "segunda-vuelta", limit: int = 50):
    """Obtiene los últimos comentarios"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT 
                id,
                usuario_nombre,
                COALESCE(usuario_avatar, '👤') as usuario_avatar,
                comentario,
                likes,
                TO_CHAR(created_at, 'HH24:MI:SS') as hora,
                TO_CHAR(created_at, 'DD/MM') as fecha
            FROM comentarios_votacion
            WHERE votacion_id = %s
            ORDER BY created_at DESC
            LIMIT %s
        """, (votacion_id, limit))
        
        resultados = cursor.fetchall()
        
        cursor.close()
        conn.close()
        
        return {
            "status": "ok",
            "comentarios": resultados,
            "total": len(resultados)
        }
        
    except Exception as e:
        print(f"Error listando comentarios: {e}")
        return {"comentarios": [], "total": 0}

@router.post("/ping")
async def ping_activo(request: Request):
    """Registra usuario activo en el chat"""
    try:
        body = await request.json()
        session_id = body.get('session_id')
        usuario_nombre = body.get('usuario_nombre', 'Anónimo')
        
        if not session_id:
            return {"status": "ok"}
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO usuarios_activos_chat (session_id, usuario_nombre, ultima_actividad)
            VALUES (%s, %s, NOW())
            ON CONFLICT (session_id) 
            DO UPDATE SET ultima_actividad = NOW(), usuario_nombre = EXCLUDED.usuario_nombre
        """, (session_id, usuario_nombre[:50] if usuario_nombre else "Anónimo"))
        
        conn.commit()
        cursor.close()
        conn.close()
        
        return {"status": "ok"}
        
    except Exception as e:
        print(f"Error en ping: {e}")
        return {"status": "ok"}

@router.get("/activos")
async def usuarios_activos():
    """Obtiene cantidad de usuarios activos en el chat (últimos 5 minutos)"""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(DISTINCT session_id) as activos
            FROM usuarios_activos_chat
            WHERE ultima_actividad > NOW() - INTERVAL '5 minutes'
        """)
        
        activos = cursor.fetchone()[0]
        
        cursor.close()
        conn.close()
        
        return {"activos": activos}
        
    except Exception as e:
        print(f"Error obteniendo activos: {e}")
        return {"activos": 0}
