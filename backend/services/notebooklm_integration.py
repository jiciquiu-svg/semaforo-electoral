"""
Servicio de integración con NotebookLM
Extrae datos de las fuentes oficiales usando prompts específicos
"""

import asyncio
import json
import hashlib
from typing import List, Dict, Optional, Any
from datetime import datetime
import httpx

from models.candidato import (
    CandidatoCompleto, DatosBiograficos, DatosJudiciales,
    DatosEconomicos, DatosHistorial, DatosFormacion
)
from services.clasificador import clasificador


class NotebookLMService:
    """
    Servicio que orquesta la extracción de datos desde NotebookLM
    """
    
    def __init__(self, api_key: str, base_url: str = "https://notebooklm.google.com/api"):
        self.api_key = api_key
        self.base_url = base_url
        self.client = httpx.AsyncClient(timeout=60.0)
    
    async def extraer_candidato(self, dni: str, nombre: str) -> Optional[CandidatoCompleto]:
        """
        Extrae todos los datos de un candidato desde las fuentes oficiales
        Usa múltiples prompts en paralelo
        """
        
        # Ejecutar prompts en paralelo para diferentes fuentes
        tasks = [
            self._extraer_biograficos(dni, nombre),
            self._extraer_judiciales(dni, nombre),
            self._extraer_economicos(dni, nombre),
            self._extraer_historial(dni, nombre),
            self._extraer_formacion(dni, nombre)
        ]
        
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Procesar resultados
        biograficos = results[0] if not isinstance(results[0], Exception) else None
        judiciales = results[1] if not isinstance(results[1], Exception) else DatosJudiciales()
        economicos = results[2] if not isinstance(results[2], Exception) else DatosEconomicos()
        historial = results[3] if not isinstance(results[3], Exception) else DatosHistorial()
        formacion = results[4] if not isinstance(results[4], Exception) else None
        
        if not biograficos:
            return None
        
        # Construir candidato completo
        candidato = CandidatoCompleto(
            biograficos=biograficos,
            formacion=formacion,
            judiciales=judiciales,
            economicos=economicos,
            historial=historial,
            fuentes_consultadas=self._listar_fuentes_consultadas()
        )
        
        # Generar hash de verificación
        candidato.hash_verificacion = self._generar_hash(candidato)
        
        return candidato
    
    async def _extraer_biograficos(self, dni: str, nombre: str) -> Optional[DatosBiograficos]:
        """
        Prompt #1: Extraer datos biográficos de RENIEC y JNE
        """
        
        prompt = f"""
        [PROMPT EXTRACCIÓN DE DATOS BIOGRÁFICOS]
        
        Objetivo: Extraer información personal y electoral del candidato {nombre} (DNI: {dni})
        
        FUENTES A CONSULTAR:
        1. RENIEC - Portal del Ciudadano: https://www.reniec.gob.pe/portal/ciudadano/
        2. JNE Infogob: https://infogob.jne.gob.pe/
        3. JNE Plataforma Electoral: https://plataformaelectoral.jne.gob.pe/
        
        INSTRUCCIONES:
        1. Busca en estas fuentes oficiales
        2. Extrae SOLO datos verificables
        3. Si un dato no está disponible, marca como None
        4. Devuelve en formato JSON estricto
        
        DATOS A EXTRAER:
        - dni: (string, 8 dígitos)
        - nombres_completos: (string)
        - fecha_nacimiento: (string, formato YYYY-MM-DD)
        - edad: (int, calcular)
        - lugar_nacimiento: (string, departamento-provincia-distrito)
        - domicilio: (string)
        - estado_civil: (string, soltero/casado/divorciado/viudo)
        - cargo_postula: (string, presidente/vicepresidente/senador/diputado)
        - numero_lista: (string)
        - partido: (string, nombre exacto)
        - alianza: (string, si aplica)
        - region_postula: (string, si aplica)
        - numero_inscripcion_jne: (string)
        
        FORMATO DE SALIDA (JSON):
        {{
            "dni": "...",
            "nombres_completos": "...",
            "fecha_nacimiento": "...",
            "edad": 0,
            "lugar_nacimiento": "...",
            "domicilio": "...",
            "estado_civil": "...",
            "cargo_postula": "...",
            "numero_lista": "...",
            "partido": "...",
            "alianza": null,
            "region_postula": null,
            "numero_inscripcion_jne": "..."
        }}
        
        IMPORTANTE: Cada campo debe tener su fuente original citada.
        """
        
        respuesta = await self._ejecutar_prompt(prompt)
        
        try:
            data = json.loads(respuesta)
            return DatosBiograficos(**data)
        except Exception as e:
            print(f"Error parseando datos biográficos: {e}")
            return None
    
    async def _extraer_judiciales(self, dni: str, nombre: str) -> DatosJudiciales:
        """
        Prompt #2: Extraer datos judiciales del Poder Judicial y Fiscalía
        """
        
        prompt = f"""
        [PROMPT EXTRACCIÓN DE DATOS JUDICIALES]
        
        Objetivo: Extraer información judicial del candidato {nombre} (DNI: {dni})
        
        FUENTES A CONSULTAR:
        1. Poder Judicial - Consulta de Expedientes: https://www.pj.gob.pe/consultaexp
        2. Ministerio Público - Fiscalía: https://www.mpfn.gob.pe/
        3. INPE - Instituto Nacional Penitenciario: https://www.inpe.gob.pe/
        
        INSTRUCCIONES:
        1. Busca en estas fuentes oficiales
        2. Extrae SOLO datos verificables con número de expediente
        3. Clasifica correctamente el estado del proceso
        4. Devuelve en formato JSON estricto
        
        DATOS A EXTRAER:
        - tiene_sentencia_firme: (boolean)
        - delito: (string, texto exacto del delito)
        - numero_expediente: (string)
        - fecha_sentencia: (string, YYYY-MM-DD)
        - pena: (string, descripción de la pena)
        - estado_pena: (string, "profugo"/"domiciliaria"/"cumplida"/"prision"/null)
        - proceso_activo: (boolean)
        - etapa_proceso: (string, "juicio_oral"/"investigacion"/"apelacion"/null)
        - fiscalia: (string, nombre de la fiscalía a cargo)
        - juzgado: (string, nombre del juzgado)
        
        FORMATO DE SALIDA (JSON):
        {{
            "tiene_sentencia_firme": false,
            "delito": null,
            "numero_expediente": null,
            "fecha_sentencia": null,
            "pena": null,
            "estado_pena": null,
            "proceso_activo": false,
            "etapa_proceso": null,
            "fiscalia": null,
            "juzgado": null
        }}
        
        IMPORTANTE: Si no se encuentran registros, devuelve el JSON con todos los valores por defecto.
        """
        
        respuesta = await self._ejecutar_prompt(prompt)
        
        try:
            data = json.loads(respuesta)
            return DatosJudiciales(**data)
        except Exception as e:
            print(f"Error parseando datos judiciales: {e}")
            return DatosJudiciales()
    
    async def _extraer_economicos(self, dni: str, nombre: str) -> DatosEconomicos:
        """
        Prompt #3: Extraer datos económicos de CGR y ONPE
        """
        
        prompt = f"""
        [PROMPT EXTRACCIÓN DE DATOS ECONÓMICOS]
        
        Objetivo: Extraer información patrimonial y financiera del candidato {nombre} (DNI: {dni})
        
        FUENTES A CONSULTAR:
        1. CGR - Declaraciones Juradas de Intereses: servicioenlinea.contraloria.gob.pe
        2. ONPE - CLARIDAD: https://claridad.onpe.gob.pe/
        3. Portal Transparencia: transparencia.gob.pe
        
        INSTRUCCIONES:
        1. Busca en estas fuentes oficiales
        2. Calcula variación patrimonial si hay múltiples declaraciones
        3. Extrae datos de aportantes y concentración
        4. Detecta contratos a familiares
        5. Devuelve en formato JSON estricto
        
        DATOS A EXTRAER:
        - patrimonio_actual: (float, monto en soles)
        - patrimonio_anterior: (float, monto en soles)
        - variacion_patrimonial: (float, porcentaje calculado)
        - periodo_variacion: (string, "2022-2025")
        - total_aportes: (float)
        - numero_aportantes: (int)
        - concentracion_top3: (float, porcentaje)
        - aportes_sospechosos: (int, cantidad)
        - tiene_contratos_familiares: (boolean)
        - contratos_familiares_detalle: (array de objetos)
        - proveedores_recurrentes: (array de strings)
        
        FORMATO DE SALIDA (JSON):
        {{
            "patrimonio_actual": null,
            "patrimonio_anterior": null,
            "variacion_patrimonial": 0.0,
            "periodo_variacion": null,
            "total_aportes": 0.0,
            "numero_aportantes": 0,
            "concentracion_top3": 0.0,
            "aportes_sospechosos": 0,
            "tiene_contratos_familiares": false,
            "contratos_familiares_detalle": null,
            "proveedores_recurrentes": null
        }}
        """
        
        respuesta = await self._ejecutar_prompt(prompt)
        
        try:
            data = json.loads(respuesta)
            return DatosEconomicos(**data)
        except Exception as e:
            print(f"Error parseando datos económicos: {e}")
            return DatosEconomicos()
    
    async def _extraer_historial(self, dni: str, nombre: str) -> DatosHistorial:
        """
        Prompt #4: Extraer historial político y público
        """
        
        prompt = f"""
        [PROMPT EXTRACCIÓN DE HISTORIAL PÚBLICO]
        
        Objetivo: Extraer historial político y público del candidato {nombre} (DNI: {dni})
        
        FUENTES A CONSULTAR:
        1. JNE Infogob: https://infogob.jne.gob.pe/
        2. Congreso de la República: https://www.congreso.gob.pe/
        3. Portal Transparencia: transparencia.gob.pe
        
        INSTRUCCIONES:
        1. Busca en estas fuentes oficiales
        2. Extrae cargos anteriores, desempeño legislativo
        3. Calcula porcentaje de asistencia si fue congresista
        4. Devuelve en formato JSON estricto
        
        DATOS A EXTRAER:
        - fue_congresista: (boolean)
        - periodo_congresista: (string, "2021-2026")
        - proyectos_presentados: (int)
        - leyes_aprobadas: (int)
        - asistencia_congreso: (float, porcentaje)
        - comisiones_integradas: (array de strings)
        - fue_funcionario: (boolean)
        - cargos_funcionario: (array de objetos con cargo, periodo, institucion)
        - fue_alcalde: (boolean)
        - fue_gobernador: (boolean)
        - candidaturas_anteriores: (array de objetos con año, cargo, partido, resultado)
        
        FORMATO DE SALIDA (JSON):
        {{
            "fue_congresista": false,
            "periodo_congresista": null,
            "proyectos_presentados": 0,
            "leyes_aprobadas": 0,
            "asistencia_congreso": null,
            "comisiones_integradas": null,
            "fue_funcionario": false,
            "cargos_funcionario": null,
            "fue_alcalde": false,
            "fue_gobernador": false,
            "candidaturas_anteriores": null
        }}
        """
        
        respuesta = await self._ejecutar_prompt(prompt)
        
        try:
            data = json.loads(respuesta)
            return DatosHistorial(**data)
        except Exception as e:
            print(f"Error parseando historial: {e}")
            return DatosHistorial()
    
    async def _extraer_formacion(self, dni: str, nombre: str) -> Optional[DatosFormacion]:
        """
        Prompt #5: Extraer formación académica de SUNEDU
        """
        
        prompt = f"""
        [PROMPT EXTRACCIÓN DE FORMACIÓN ACADÉMICA]
        
        Objetivo: Extraer formación académica del candidato {nombre} (DNI: {dni})
        
        FUENTES A CONSULTAR:
        1. SUNEDU: https://www.sunedu.gob.pe/
        2. Universidades (si están disponibles públicamente)
        
        INSTRUCCIONES:
        1. Busca en SUNEDU si el título está registrado
        2. Extrae datos de formación superior
        3. Devuelve en formato JSON estricto
        
        DATOS A EXTRAER:
        - universidad: (string)
        - carrera: (string)
        - titulo: (string)
        - grado: (string, "bachiller"/"licenciado"/"magister"/"doctor")
        - sunedu_registro: (string, número de registro)
        - estudios_posgrado: (array de objetos con tipo, institucion, especialidad)
        - certificaciones: (array de strings)
        
        FORMATO DE SALIDA (JSON):
        {{
            "universidad": null,
            "carrera": null,
            "titulo": null,
            "grado": null,
            "sunedu_registro": null,
            "estudios_posgrado": null,
            "certificaciones": null
        }}
        """
        
        respuesta = await self._ejecutar_prompt(prompt)
        
        try:
            data = json.loads(respuesta)
            return DatosFormacion(**data) if data.get("universidad") else None
        except Exception as e:
            print(f"Error parseando formación: {e}")
            return None
    
    async def _ejecutar_prompt(self, prompt: str) -> str:
        """
        Ejecuta un prompt en NotebookLM y retorna la respuesta
        """
        # Simulación - Aquí iría la llamada real a la API de NotebookLM
        # Por ahora retorna un JSON de ejemplo
        
        # En producción, esto sería:
        # response = await self.client.post(
        #     f"{self.base_url}/generate",
        #     headers={"Authorization": f"Bearer {self.api_key}"},
        #     json={"prompt": prompt}
        # )
        # return response.text
        
        # Simulación para desarrollo
        await asyncio.sleep(0.5)  # Simular tiempo de procesamiento
        return "{}"  # JSON vacío, en producción vendría con datos
    
    def _listar_fuentes_consultadas(self) -> List[str]:
        """Lista todas las fuentes oficiales consultadas"""
        return [
            "RENIEC - Padrón Electoral",
            "JNE - Infogob",
            "JNE - Plataforma Electoral",
            "ONPE - CLARIDAD",
            "CGR - Declaraciones Juradas de Intereses",
            "Poder Judicial - Consulta de Expedientes",
            "Ministerio Público - Fiscalía",
            "INPE - Registro Penitenciario",
            "Congreso de la República",
            "Portal de Transparencia del Estado Peruano",
            "SUNEDU - Registro de Títulos"
        ]
    
    def _generar_hash(self, candidato: CandidatoCompleto) -> str:
        """Genera hash de verificación para integridad de datos"""
        contenido = f"{candidato.biograficos.dni}{candidato.ultima_actualizacion.isoformat()}"
        return hashlib.sha256(contenido.encode()).hexdigest()[:16]
    
    async def procesar_masivo(self, candidatos: List[tuple]) -> List[CandidatoCompleto]:
        """
        Procesa múltiples candidatos en paralelo
        """
        tasks = [self.extraer_candidato(dni, nombre) for dni, nombre in candidatos]
        results = await asyncio.gather(*tasks)
        return [r for r in results if r is not None]


# Instancia global
notebooklm_service = NotebookLMService(api_key="TU_API_KEY_AQUI")