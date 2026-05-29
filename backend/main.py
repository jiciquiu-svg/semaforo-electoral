# backend/main.py - VERSIÓN ROBUSTA DEFINITIVA
"""
Candidato al Desnudo API - Transparencia Electoral Perú 2026
Versión robusta con manejo de errores
"""

# Cargar variables de entorno antes que el resto de componentes
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, HTTPException, Query, BackgroundTasks, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from typing import List, Optional, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field, validator
from services.jne_client import jne_client
from api.analytics import router as analytics_router
from api.segunda_vuelta import router as segunda_vuelta_router
from api.comentarios import router as comentarios_router
import uvicorn
import os
import json

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
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Registrar Routers
app.include_router(analytics_router)
app.include_router(segunda_vuelta_router)
app.include_router(comentarios_router)

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

@app.get("/api/proxy-image")
async def proxy_image(url: str = Query(..., description="URL de la imagen del JNE")):
    """
    Proxy para cargar imágenes del JNE que bloquean el hotlinking directo.
    """
    import httpx
    
    headers = {
        "Referer": "https://votoinformado.jne.gob.pe/home",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10.0)
            if resp.status_code != 200:
                raise HTTPException(status_code=resp.status_code, detail="No se pudo obtener la imagen del JNE")
            
            return Response(content=resp.content, media_type=resp.headers.get("Content-Type", "image/jpeg"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error en el proxy: {str(e)}")

# ============================================================
# INICIO DE SERVIDOR
# ============================================================

# =====================================================
# MODELOS DE ENTRADA
# =====================================================

class CandidateCreate(BaseModel):
    dni: str = Field(..., min_length=8, max_length=8, description="DNI del candidato (8 dígitos)")
    nombres_completos: str
    partido: str
    cargo_postula: str = "senador"
    url_hoja_vida: Optional[str] = None

    @validator('dni')
    def validate_dni_digits(cls, v):
        if not v.isdigit():
            raise ValueError('El DNI debe contener solo dígitos')
        return v

# =====================================================
# ENDPOINTS PRINCIPALES
# =====================================================

@app.get("/")
async def root():
    """Endpoint raíz con información de la API"""
    return {
        "name": "Candidato al Desnudo API",
        "version": "2.1.0",
        "status": "operational",
        "endpoints": {
            "health": "/health",
            "health_db": "/api/health/db",
            "candidatos": "/api/candidatos",
            "create_candidato": "[POST] /api/candidatos",
            "buscar": "/api/buscar?q=texto",
            "estadisticas": "/api/estadisticas",
            "docs": "/docs"
        }
    }

# =====================================================
# TAREAS EN SEGUNDO PLANO (ENRIQUECIMIENTO)
# =====================================================

async def enrich_candidate_data(dni: str, url_hoja_vida: Optional[str] = None):
    """Tarea para validar y enriquecer datos desde el JNE v\u00eda HTML Parsing"""
    print(f"🚀 Iniciando enriquecimiento en segundo plano para DNI: {dni}")
    
    if not url_hoja_vida:
        # Fallback a URL est\u00e1ndar si no se provee
        url_hoja_vida = f"https://declara.jne.gob.pe/DeclaraPublico/HojaVida?dni={dni}"

    try:
        # 1. Obtener datos enriquecidos (BS4 Parsing / API JSON)
        datos = await jne_client.enriquecer_candidato(dni, url_hoja_vida)
        
        if datos:
            print(f"✅ Datos obtenidos para {dni}. Actualizando DB...")
            conn = get_db_connection()
            if conn:
                cur = conn.cursor()
                # 1.1 Actualizar Candidato
                cur.execute("""
                    UPDATE candidatos 
                    SET foto_url = %s,
                        url_hoja_vida = %s,
                        ingresos_total = %s,
                        tiene_sentencias = %s,
                        tipo_sentencia = %s,
                        ultima_actualizacion = %s
                    WHERE dni = %s
                """, (
                    datos.get("foto_url"),
                    url_hoja_vida,
                    datos.get("ingresos_total", 0.0),
                    datos.get("tiene_sentencias", False),
                    datos.get("tipo_sentencia"),
                    datetime.now(),
                    dni
                ))

                # 1.2 Formación Académica (Limpiar e Insertar)
                cur.execute("DELETE FROM formacion_academica WHERE candidato_dni = %s", (dni,))
                for f in datos.get("formacion", []):
                    cur.execute("""
                        INSERT INTO formacion_academica (candidato_dni, tipo, institucion, titulo, grado, anio_fin, fuente)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (dni, f['tipo'], f['institucion'], f['titulo'], f['grado'], f['anio_fin'], 'JNE'))

                # 1.3 Experiencia Laboral
                cur.execute("DELETE FROM experiencia_laboral WHERE candidato_dni = %s", (dni,))
                for e in datos.get("experiencia", []):
                    cur.execute("""
                        INSERT INTO experiencia_laboral (candidato_dni, sector, institucion, cargo, fecha_inicio, fecha_fin, fuente)
                        VALUES (%s, %s, %s, %s, %s, %s, %s)
                    """, (dni, e['sector'], e['institucion'], e['cargo'], str(e['anio_inicio']), str(e['anio_fin']), 'JNE'))

                # 1.4 Declaraciones Juradas
                cur.execute("DELETE FROM declaraciones_juradas WHERE candidato_dni = %s", (dni,))
                cur.execute("""
                    INSERT INTO declaraciones_juradas (candidato_dni, ingresos_anuales, url_fuente, fecha_extraccion)
                    VALUES (%s, %s, %s, %s)
                """, (dni, datos.get("ingresos_total"), url_hoja_vida, datetime.now()))

                # 1.5 Sentencias
                if datos.get("tiene_sentencias"):
                    cur.execute("DELETE FROM sentencias WHERE candidato_dni = %s", (dni,))
                    cur.execute("""
                        INSERT INTO sentencias (candidato_dni, delito, enlace_fuente)
                        VALUES (%s, %s, %s)
                    """, (dni, datos.get("detalle_sentencias"), url_hoja_vida))

                conn.commit()
                cur.close()
                conn.close()
                print(f"🎉 Enriquecimiento integral finalizado para DNI {dni}")
        else:
            print(f"⚠️ No se pudo obtener información enriquecida para {dni}")
            
    except Exception as e:
        print(f"❌ Error en tarea de enriquecimiento: {str(e)}")

@app.post("/api/candidatos")
async def crear_candidato(candidato: CandidateCreate, background_tasks: BackgroundTasks):
    """
    Registra un nuevo candidato y dispara validación en segundo plano.
    """
    # 1. Verificar si ya existe en la base de datos
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT dni FROM candidatos WHERE dni = %s", (candidato.dni,))
            if cursor.fetchone():
                cursor.close()
                conn.close()
                raise HTTPException(status_code=400, detail=f"El candidato con DNI {candidato.dni} ya existe")
            
            # 2. Insertar básico
            cursor.execute("""
                INSERT INTO candidatos (dni, nombres_completos, partido, cargo_postula, url_hoja_vida, ultima_actualizacion)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (candidato.dni, candidato.nombres_completos, candidato.partido, candidato.cargo_postula, candidato.url_hoja_vida, datetime.now()))
            
            conn.commit()
            cursor.close()
            conn.close()
            
            # 3. Disparar tarea en segundo plano
            background_tasks.add_task(enrich_candidate_data, candidato.dni, candidato.url_hoja_vida)
            
            return {
                "message": "Candidato registrado exitosamente. Validación en curso.",
                "dni": candidato.dni,
                "status": "enrichment_started"
            }
            
        except HTTPException:
            raise
        except Exception as e:
            if conn: conn.close()
            raise HTTPException(status_code=500, detail=f"Error al guardar: {str(e)}")
    
    raise HTTPException(status_code=503, detail="Servicio de base de datos no disponible")

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
    busqueda: Optional[str] = None,
    cargo: Optional[str] = None,
    region: Optional[str] = None,
    tipo_senador: Optional[str] = None  # 'nacional' o 'regional'
):
    """Listar candidatos con filtros robustos incluyendo cargo y region"""
    
    # Mapping PWA/Frontend to DB values
    cargo_map = {
        'presidente': 'presidente',
        'senador': 'senadores',
        'diputado': 'diputados',
        'parlamento_andino': 'parlamento_andino'
    }
    db_cargo = cargo_map.get(cargo, cargo)

    # Intentar obtener de BD
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            query = "SELECT dni, nombres_completos as nombres, partido, cargo_postula, nivel_criticidad as nivel, color, puntaje_transparencia, mensaje_ciudadano as mensaje, alertas_activas as alertas, foto_url, distrito_electoral FROM candidatos"
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
            if db_cargo:
                conditions.append("cargo_postula = %s")
                params.append(db_cargo)
            if region:
                # Búsqueda flexible para distrito_electoral (ej: 'LIMA' busca 'DISTRITO MULTIPLE - LIMA')
                conditions.append("distrito_electoral ILIKE %s")
                params.append(f"%{region}%")
            if tipo_senador:
                if tipo_senador == 'nacional':
                    conditions.append("distrito_electoral = 'DISTRITO UNICO'")
                elif tipo_senador == 'regional':
                    conditions.append("distrito_electoral != 'DISTRITO UNICO'")
            
            if conditions:
                query += " WHERE " + " AND ".join(conditions)
            
            query += " ORDER BY puntaje_transparencia DESC LIMIT %s OFFSET %s"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            results = cursor.fetchall()


            # Obtener estadísticas resumidas
            cursor.execute("""
                SELECT 
                    nivel_criticidad, 
                    COUNT(*) as cantidad 
                FROM candidatos 
                GROUP BY nivel_criticidad
            """)
            stats_rows = cursor.fetchall()
            stats_map = {
                "total": 0,
                "rojos": 0,
                "naranjas": 0,
                "amarillos": 0,
                "verdes": 0
            }
            for row in stats_rows:
                nivel = row['nivel_criticidad']
                cant = row['cantidad']
                stats_map["total"] += cant
                if nivel == 'rojo': stats_map["rojos"] = cant
                elif nivel == 'naranja': stats_map["naranjas"] = cant
                elif nivel == 'amarillo': stats_map["amarillos"] = cant
                elif nivel == 'verde': stats_map["verdes"] = cant

            cursor.close()
            conn.close()
            
            return {
                "candidatos": results,
                "total": stats_map["total"],
                "estadisticas": stats_map,
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
    """Obtener candidato completo por DNI (Perfil Rico)"""
    
    conn = get_db_connection()
    if conn:
        try:
            cursor = conn.cursor(cursor_factory=RealDictCursor)
            
            # 1. Datos básicos
            cursor.execute("SELECT * FROM candidatos WHERE dni = %s", (dni,))
            candidato = cursor.fetchone()
            
            if not candidato:
                cursor.close()
                conn.close()
                raise HTTPException(status_code=404, detail=f"Candidato con DNI {dni} no encontrado")
                
            # 2. Formación Académica
            cursor.execute("""
                SELECT tipo, institucion, titulo, grado, anio_inicio, anio_fin, sunedu_registro, fuente 
                FROM formacion_academica 
                WHERE candidato_dni = %s 
                ORDER BY anio_fin DESC NULLS LAST
            """, (dni,))
            candidato['formacion'] = cursor.fetchall()
            
            # 3. Experiencia Laboral
            cursor.execute("""
                SELECT sector, institucion, cargo, fecha_inicio, fecha_fin, funciones, fuente 
                FROM experiencia_laboral 
                WHERE candidato_dni = %s 
                ORDER BY fecha_inicio DESC NULLS LAST
            """, (dni,))
            candidato['experiencia'] = cursor.fetchall()
            
            # 4. Declaraciones Juradas
            cursor.execute("""
                SELECT fecha_declaracion, patrimonio_total, ingresos_anuales, url_fuente, fecha_extraccion 
                FROM declaraciones_juradas 
                WHERE candidato_dni = %s 
                ORDER BY fecha_declaracion DESC NULLS LAST
            """, (dni,))
            candidato['declaraciones'] = cursor.fetchall()
            
            cursor.close()
            conn.close()
            return candidato
            
        except HTTPException:
            raise
        except Exception as e:
            if conn: conn.close()
            print(f"Error recuperando perfil rico: {e}")
    
    # Fallback to mock (solo datos básicos)
    for c in MOCK_CANDIDATOS:
        if c["dni"] == dni:
            return {**c, "formacion": [], "experiencia": [], "declaraciones": [], "source": "mock_limited"}
    
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
    print("CANDIDATO AL DESNUDO API - VERSION ROBUSTA")
    print("=" * 50)
    print(f"Base de datos: {'Disponible' if DB_AVAILABLE else 'No instalada'}")
    print(f"HTTPX: {'Disponible' if HTTPX_AVAILABLE else 'No instalado'}")
    print("=" * 50)
    print("Servidor corriendo en: http://localhost:8001")
    print("Documentacion: http://localhost:8001/docs")
    print("=" * 50)
    
    port = int(os.getenv("PORT", 8001))
    
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=False,
        log_level="info"
    )