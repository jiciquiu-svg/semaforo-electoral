# backend/main.py - VERSIÓN ROBUSTA DEFINITIVA
"""
Candidato al Desnudo API - Transparencia Electoral Perú 2026
Versión robusta con manejo de errores
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
from dotenv import load_dotenv
import uvicorn
import os
import json

# Cargar variables de entorno (.env)
load_dotenv()

# Intentar importar dependencias opcionales con fallback
try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    DB_AVAILABLE = True
except ImportError:
    DB_AVAILABLE = False
    print("⚠️ psycopg2 no instalado - Base de datos no disponible")

try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("⚠️ httpx no instalado - NotebookLM no disponible")

# =====================================================
# CREAR APLICACIÓN FASTAPI
# =====================================================

app = FastAPI(
    title="Candidato al Desnudo API",
    description="API de transparencia electoral para Perú 2026",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# =====================================================
# CONFIGURACIÓN CORS (para frontend)
# =====================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================================
# CONFIGURACIÓN DE BASE DE DATOS
# =====================================================

DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", 54333)),
    "database": os.getenv("DB_NAME", "candidatos_db"),
    "user": os.getenv("DB_USER", "admin"),
    "password": os.getenv("DB_PASSWORD", "dev_password_2026")
}

def get_db_connection():
    """Obtener conexión a PostgreSQL con manejo de errores"""
    if not DB_AVAILABLE:
        return None
        
    database_url = os.getenv("DATABASE_URL")
    
    try:
        if database_url:
            # Conexión vía URL (Supabase / Railway)
            conn = psycopg2.connect(database_url)
        else:
            # Conexión vía parámetros individuales (Local)
            conn = psycopg2.connect(**DB_CONFIG)
        return conn
    except Exception as e:
        print(f"Error de conexión a DB: {e}")
        return None

# =====================================================
# DATOS DE EJEMPLO (para cuando no hay BD)
# =====================================================

MOCK_CANDIDATOS = [
    {
        "dni": "12345678",
        "nombres": "Ana María López García",
        "partido": "Partido Democrático",
        "cargo_postula": "senador",
        "nivel": "verde",
        "nivel_criticidad": "verde",
        "color": "verde",
        "puntaje_transparencia": 85,
        "mensaje": "✅ Sin alertas - Información completa",
        "mensaje_ciudadano": "✅ Sin alertas - Información completa",
        "alertas": []
    },
    {
        "dni": "23456789",
        "nombres": "Carlos Alberto Mendoza Ríos",
        "partido": "Partido Liberal",
        "cargo_postula": "diputado",
        "nivel": "amarillo",
        "nivel_criticidad": "amarillo",
        "color": "amarillo",
        "puntaje_transparencia": 65,
        "mensaje": "ℹ️ Ex congresista - Ver historial",
        "mensaje_ciudadano": "ℹ️ Ex congresista - Ver historial",
        "alertas": []
    },
    {
        "dni": "34567890",
        "nombres": "Roberto Javier Fernández Torres",
        "partido": "Partido Regional",
        "cargo_postula": "senador",
        "nivel": "naranja",
        "nivel_criticidad": "naranja",
        "color": "naranja",
        "puntaje_transparencia": 42,
        "mensaje": "⚠️ Alertas económicas detectadas",
        "mensaje_ciudadano": "⚠️ Alertas económicas detectadas",
        "alertas": [{"tipo": "variacion_patrimonial", "descripcion": "Patrimonio +150%"}]
    },
    {
        "dni": "45678901",
        "nombres": "María Elena Quispe Mamani",
        "partido": "Partido Indígena",
        "cargo_postula": "diputado",
        "nivel": "naranja",
        "nivel_criticidad": "naranja",
        "color": "naranja",
        "puntaje_transparencia": 38,
        "mensaje": "⚠️ En juicio oral por colusión",
        "mensaje_ciudadano": "⚠️ En juicio oral por colusión",
        "alertas": [{"tipo": "proceso_activo", "descripcion": "Juicio oral en curso"}]
    },
    {
        "dni": "56789012",
        "nombres": "Jorge Luis Paredes Castro",
        "partido": "Partido Nacionalista",
        "cargo_postula": "presidente",
        "nivel": "rojo",
        "nivel_criticidad": "rojo",
        "color": "rojo",
        "puntaje_transparencia": 15,
        "mensaje": "🔴 Sentencia firme por corrupción - INHABILITADO",
        "mensaje_ciudadano": "🔴 Sentencia firme por corrupción - INHABILITADO",
        "alertas": [{"tipo": "sentencia", "descripcion": "8 años de prisión"}]
    }
]

# =====================================================
# ENDPOINTS PRINCIPALES
# =====================================================

@app.get("/")
async def root():
    """Endpoint raíz con información de la API"""
    return {
        "name": "Candidato al Desnudo API",
        "version": "2.0.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "health_db": "/api/health/db",
            "candidatos": "/api/candidatos",
            "buscar": "/api/buscar?q=texto",
            "estadisticas": "/api/estadisticas",
            "docs": "/docs"
        }
    }

@app.get("/health")
async def health():
    """Health check simple"""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "api": "up",
            "database": "connected" if get_db_connection() else "disconnected",
            "httpx": "available" if HTTPX_AVAILABLE else "unavailable"
        }
    }

@app.get("/api/health/db")
async def health_db():
    """Verificar conexión a base de datos"""
    if not DB_AVAILABLE:
        return {
            "status": "degraded",
            "database": "psycopg2_not_installed",
            "message": "Instalar psycopg2-binary para conectar a PostgreSQL"
        }
    
    conn = get_db_connection()
    if conn:
        conn.close()
        return {
            "status": "healthy",
            "database": "connected",
            "host": DB_CONFIG["host"],
            "port": DB_CONFIG["port"]
        }
    else:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "message": "No se pudo conectar a PostgreSQL. ¿Está corriendo docker-compose up -d?"
        }

@app.get("/api/candidatos")
async def listar_candidatos(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    partido: Optional[str] = None,
    nivel: Optional[str] = None,
    busqueda: Optional[str] = None
):
    """Listar candidatos con filtros"""
    
    # Intentar obtener de BD
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            query = "SELECT dni, nombres_completos as nombres, partido, cargo_postula, nivel_criticidad as nivel, color, puntaje_transparencia, mensaje_ciudadano as mensaje, alertas_activas as alertas FROM candidatos"
            params = []
            conditions = []
            
            if partido:
                conditions.append("partido = %s")
                params.append(partido)
            if nivel:
                conditions.append("nivel_criticidad = %s")
                params.append(nivel)
            if busqueda:
                conditions.append("nombres_completos ILIKE %s")
                params.append(f"%{busqueda}%")
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " ORDER BY puntaje_transparencia DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            
            return {
                "candidatos": results,
                "total": len(results),
                "filters": {"partido": partido, "nivel": nivel, "busqueda": busqueda}
            }
        except Exception as e:
            conn.close()
            # Fallback a datos mock
            return {
                "candidatos": MOCK_CANDIDATOS[:limit],
                "total": len(MOCK_CANDIDATOS),
                "warning": f"Error en BD: {str(e)}. Usando datos de ejemplo."
            }
    
    # Fallback a datos mock
    filtered = MOCK_CANDIDATOS
    if partido:
        filtered = [c for c in filtered if c["partido"] == partido]
    if nivel:
        filtered = [c for c in filtered if c["nivel_criticidad"] == nivel]
    if busqueda:
        filtered = [c for c in filtered if busqueda.lower() in c["nombres"].lower()]
    
    return {
        "candidatos": filtered[offset:offset+limit],
        "total": len(filtered),
        "source": "mock_data"
    }

@app.get("/api/candidatos/{dni}")
async def obtener_candidato(dni: str):
    """Obtener candidato por DNI"""
    
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("SELECT * FROM candidatos WHERE dni = %s", (dni,))
            result = cursor.fetchone()
            cursor.close()
            conn.close()
            
            if result:
                return result
        except Exception as e:
            pass
    
    # Buscar en mock
    for c in MOCK_CANDIDATOS:
        if c["dni"] == dni:
            return c
    
    raise HTTPException(status_code=404, detail=f"Candidato con DNI {dni} no encontrado")

@app.get("/api/buscar")
async def buscar_candidatos(q: str = Query(..., min_length=2)):
    """Búsqueda rápida por nombre o partido"""
    
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT dni, nombres_completos as nombres, partido, nivel_criticidad as nivel, color
                FROM candidatos 
                WHERE nombres_completos ILIKE %s OR partido ILIKE %s
                LIMIT 20
            """, (f"%{q}%", f"%{q}%"))
            results = cursor.fetchall()
            cursor.close()
            conn.close()
            return {"results": results, "source": "database"}
        except Exception as e:
            pass
    
    # Buscar en mock
    results = [c for c in MOCK_CANDIDATOS 
               if q.lower() in c["nombres"].lower() or q.lower() in c["partido"].lower()]
    return {"results": results[:20], "source": "mock_data"}

@app.get("/api/estadisticas")
async def obtener_estadisticas():
    """Estadísticas agregadas"""
    
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            cursor.execute("""
                SELECT 
                    nivel_criticidad, 
                    COUNT(*) as cantidad 
                FROM candidatos 
                GROUP BY nivel_criticidad
            """)
            niveles = cursor.fetchall()
            cursor.close()
            conn.close()
            return {"por_nivel": niveles, "source": "database"}
        except Exception as e:
            pass
    
    # Estadísticas desde mock
    conteo = {}
    for c in MOCK_CANDIDATOS:
        nivel = c["nivel_criticidad"]
        conteo[nivel] = conteo.get(nivel, 0) + 1
    
    return {"por_nivel": [{"nivel_criticidad": k, "cantidad": v} for k, v in conteo.items()], "source": "mock_data"}

# =====================================================
# MANEJO DE ERRORES GLOBAL
# =====================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": True,
            "status_code": exc.status_code,
            "detail": exc.detail,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={
            "error": True,
            "status_code": 500,
            "detail": f"Error interno: {str(exc)}",
            "timestamp": datetime.now().isoformat()
        }
    )

# =====================================================
# EJECUCIÓN
# =====================================================

if __name__ == "__main__":
    print("=" * 50)
    print("🚀 CANDIDATO AL DESNUDO API - VERSIÓN ROBUSTA")
    print("=" * 50)
    print(f"📦 Base de datos: {'Disponible' if DB_AVAILABLE else 'No instalada'}")
    print(f"🔌 HTTPX: {'Disponible' if HTTPX_AVAILABLE else 'No instalado'}")
    print("=" * 50)
    print("📍 Servidor corriendo en: http://localhost:8001")
    print("📚 Documentación: http://localhost:8001/docs")
    print("=" * 50)
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )