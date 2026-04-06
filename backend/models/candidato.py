"""
Modelo de datos del candidato - Clasificación automática
"""

from enum import Enum
from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, validator


class NivelCriticidad(str, Enum):
    """Niveles de criticidad del candidato"""
    VERDE = "verde"
    AMARILLO = "amarillo"
    NARANJA = "naranja"
    ROJO = "rojo"


class SubcategoriaNivel(str, Enum):
    """Subcategorías específicas dentro de cada nivel"""
    # Nivel ROJO
    SENTENCIA_FIRME_CORRUPCION = "sentencia_firme_corrupcion"
    SENTENCIA_FIRME_CRIMEN = "sentencia_firme_crimen"
    SENTENCIA_FIRME_VIOLENCIA = "sentencia_firme_violencia"
    SENTENCIA_FIRME_PROFUGO = "sentencia_firme_profugo"
    SENTENCIA_FIRME_DOMICILIARIA = "sentencia_firme_domiciliaria"
    SENTENCIA_FIRME_CUMPLIDA = "sentencia_firme_cumplida"
    
    # Nivel NARANJA
    PROCESO_JUICIO_ORAL = "proceso_juicio_oral"
    INVESTIGACION_FISCAL = "investigacion_fiscal"
    SENTENCIA_APELACION = "sentencia_apelacion"
    ALERTAS_ECONOMICAS = "alertas_economicas"
    
    # Nivel AMARILLO
    HISTORIAL_PUBLICO = "historial_publico"
    ARCHIVADO = "archivado"
    
    # Nivel VERDE
    BASE = "base"


class DelitoGravedad(str, Enum):
    """Clasificación de gravedad de delitos"""
    INHABILITANTE = "inhabilitante"  # Corrupción, crimen organizado
    GRAVE = "grave"  # Violencia familiar, homicidio
    LEVE = "leve"  # Delitos menores


# Datos de entrada para clasificación
class DatosJudiciales(BaseModel):
    """Datos judiciales del candidato"""
    tiene_sentencia_firme: bool = False
    delito: Optional[str] = None
    numero_expediente: Optional[str] = None
    fecha_sentencia: Optional[str] = None
    pena: Optional[str] = None
    estado_pena: Optional[str] = None  # "profugo", "domiciliaria", "cumplida", "prision"
    proceso_activo: bool = False
    etapa_proceso: Optional[str] = None  # "juicio_oral", "investigacion", "apelacion"
    fiscalia: Optional[str] = None
    juzgado: Optional[str] = None
    
    @validator('estado_pena')
    def validar_estado_pena(cls, v):
        if v and v not in ['profugo', 'domiciliaria', 'cumplida', 'prision']:
            raise ValueError(f'Estado de pena inválido: {v}')
        return v
    
    @validator('etapa_proceso')
    def validar_etapa_proceso(cls, v):
        if v and v not in ['juicio_oral', 'investigacion', 'apelacion']:
            raise ValueError(f'Etapa de proceso inválida: {v}')
        return v


class DatosEconomicos(BaseModel):
    """Datos económicos y financieros"""
    # Patrimonio
    patrimonio_actual: Optional[float] = None
    patrimonio_anterior: Optional[float] = None
    variacion_patrimonial: float = 0.0  # Porcentaje
    periodo_variacion: Optional[str] = None  # "2022-2025"
    
    # Financiamiento de campaña
    total_aportes: float = 0.0
    numero_aportantes: int = 0
    concentracion_top3: float = 0.0  # Porcentaje de aportes de top 3
    aportes_sospechosos: int = 0
    
    # Contratos y vínculos
    tiene_contratos_familiares: bool = False
    contratos_familiares_detalle: Optional[List[Dict]] = None
    proveedores_recurrentes: Optional[List[str]] = None
    
    # Umbrales de alerta
    UMBRAL_VARIACION_ALTA: float = 100.0
    UMBRAL_VARIACION_MEDIA: float = 50.0
    UMBRAL_CONCENTRACION_PELIGROSA: float = 30.0
    UMBRAL_CONCENTRACION_ALERTA: float = 20.0


class DatosHistorial(BaseModel):
    """Historial público y político"""
    fue_congresista: bool = False
    periodo_congresista: Optional[str] = None
    proyectos_presentados: int = 0
    leyes_aprobadas: int = 0
    asistencia_congreso: Optional[float] = None  # Porcentaje
    comisiones_integradas: Optional[List[str]] = None
    
    fue_funcionario: bool = False
    cargos_funcionario: Optional[List[Dict]] = None  # [{"cargo": "Ministro", "periodo": "2022-2024", "institucion": "MEF"}]
    
    fue_alcalde: bool = False
    fue_gobernador: bool = False
    candidaturas_anteriores: Optional[List[Dict]] = None


class DatosBiograficos(BaseModel):
    """Datos biográficos básicos"""
    dni: str
    nombres_completos: str
    fecha_nacimiento: Optional[str] = None
    edad: Optional[int] = None
    lugar_nacimiento: Optional[str] = None
    domicilio: Optional[str] = None
    estado_civil: Optional[str] = None
    
    # Datos electorales
    cargo_postula: str  # "presidente", "vicepresidente", "senador", "diputado"
    numero_lista: Optional[str] = None
    partido: str
    alianza: Optional[str] = None
    region_postula: Optional[str] = None
    numero_inscripcion_jne: Optional[str] = None


class DatosFormacion(BaseModel):
    """Formación académica"""
    universidad: Optional[str] = None
    carrera: Optional[str] = None
    titulo: Optional[str] = None
    grado: Optional[str] = None  # "bachiller", "licenciado", "magister", "doctor"
    sunedu_registro: Optional[str] = None
    
    estudios_posgrado: Optional[List[Dict]] = None  # [{"tipo": "maestria", "institucion": "PUCP", "especialidad": "Derecho"}]
    certificaciones: Optional[List[str]] = None


class CandidatoCompleto(BaseModel):
    """Modelo completo del candidato con todos los datos"""
    # Datos básicos
    biograficos: DatosBiograficos
    formacion: Optional[DatosFormacion] = None
    
    # Datos para clasificación
    judiciales: DatosJudiciales = DatosJudiciales()
    economicos: DatosEconomicos = DatosEconomicos()
    historial: DatosHistorial = DatosHistorial()
    
    # Campos calculados (se llenan automáticamente)
    nivel_criticidad: Optional[NivelCriticidad] = None
    subcategoria: Optional[SubcategoriaNivel] = None
    mensaje_ciudadano: Optional[str] = None
    inhabilitado: bool = False
    alertas_activas: List[Dict] = []
    puntaje_transparencia: Optional[int] = None
    
    # Auditoría
    fuentes_consultadas: List[str] = []
    ultima_actualizacion: datetime = Field(default_factory=datetime.now)
    hash_verificacion: Optional[str] = None


class ResultadoClasificacion(BaseModel):
    """Resultado de la clasificación para mostrar al usuario"""
    dni: str
    nombres: str
    partido: str
    cargo_postula: str
    
    nivel: NivelCriticidad
    color: str  # "verde", "amarillo", "naranja", "rojo"
    subcategoria: SubcategoriaNivel
    mensaje: str
    inhabilitado: bool
    
    alertas: List[Dict] = []
    puntaje_transparencia: Optional[int] = None
    
    fuentes: List[str] = []
    ultima_actualizacion: str