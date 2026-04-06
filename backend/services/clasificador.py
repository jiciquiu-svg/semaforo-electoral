"""
Servicio de clasificación automática de candidatos
Motor de reglas para asignar niveles, colores y mensajes
"""

from typing import List, Dict, Optional, Tuple
from models.candidato import (
    CandidatoCompleto, ResultadoClasificacion,
    NivelCriticidad, SubcategoriaNivel,
    DatosJudiciales, DatosEconomicos, DatosHistorial
)


class ClasificadorCandidatos:
    """
    Motor de clasificación automática
    Asigna nivel, color y subcategoría según reglas jerárquicas
    """
    
    # ==========================================
    # CONFIGURACIÓN DE UMBRALES
    # ==========================================
    
    UMBRAL_VARIACION_PATRIMONIAL_ALTA = 100.0    # %
    UMBRAL_VARIACION_PATRIMONIAL_MEDIA = 50.0    # %
    UMBRAL_CONCENTRACION_APORTES_PELIGROSA = 30.0  # %
    UMBRAL_CONCENTRACION_APORTES_ALERTA = 20.0   # %
    UMBRAL_ASISTENCIA_CONGRESO_BAJA = 70.0       # %
    UMBRAL_METAS_GESTION_BAJA = 50.0             # %
    
    # Delitos que inhabilitan automáticamente (por ley)
    DELITOS_INHABILITANTES = [
        "corrupcion", "colusion", "peculado", "cohecho",
        "crimen_organizado", "lavado_activos", "trafico_influencias",
        "enriquecimiento_ilícito", "concusión"
    ]
    
    # Delitos graves (no inhabilitan pero son críticos)
    DELITOS_GRAVES = [
        "violencia_familiar", "feminicidio", "violacion",
        "homicidio", "lesiones_graves", "secuestro"
    ]
    
    # ==========================================
    # MÉTODO PRINCIPAL DE CLASIFICACIÓN
    # ==========================================
    
    def clasificar(self, candidato: CandidatoCompleto) -> ResultadoClasificacion:
        """
        Clasifica al candidato automáticamente
        Retorna resultado con nivel, color y mensaje
        """
        
        # 1. Detectar alertas económicas primero (para usarlas después)
        alertas_economicas = self._detectar_alertas_economicas(candidato.economicos)
        
        # 2. Clasificación por jerarquía (prioridad: ROJO > NARANJA > AMARILLO > VERDE)
        if self._tiene_sentencia_firme(candidato.judiciales):
            nivel, subcat, mensaje = self._clasificar_sentencia(candidato.judiciales)
            
        elif self._tiene_proceso_activo(candidato.judiciales):
            nivel, subcat, mensaje = self._clasificar_proceso_activo(candidato.judiciales)
            
        elif alertas_economicas:
            nivel, subcat, mensaje = self._clasificar_alertas_economicas(
                candidato.economicos, alertas_economicas
            )
            
        elif self._tiene_historial_publico(candidato.historial):
            nivel, subcat, mensaje = self._clasificar_historial(candidato.historial)
            
        else:
            nivel, subcat, mensaje = self._clasificar_base()
        
        # 3. Calcular puntaje de transparencia
        puntaje = self._calcular_puntaje_transparencia(candidato)
        
        # 4. Construir resultado
        return ResultadoClasificacion(
            dni=candidato.biograficos.dni,
            nombres=candidato.biograficos.nombres_completos,
            partido=candidato.biograficos.partido,
            cargo_postula=candidato.biograficos.cargo_postula,
            nivel=nivel,
            color=self._nivel_a_color(nivel),
            subcategoria=subcat,
            mensaje=mensaje,
            inhabilitado=self._esta_inhabilitado(candidato.judiciales),
            alertas=alertas_economicas,
            puntaje_transparencia=puntaje,
            fuentes=candidato.fuentes_consultadas[:5],  # Top 5 fuentes
            ultima_actualizacion=candidato.ultima_actualizacion.isoformat()
        )
    
    # ==========================================
    # CLASIFICACIÓN NIVEL ROJO (SENTENCIAS)
    # ==========================================
    
    def _tiene_sentencia_firme(self, judicial: DatosJudiciales) -> bool:
        """Detecta si tiene sentencia firme"""
        return judicial.tiene_sentencia_firme
    
    def _clasificar_sentencia(self, judicial: DatosJudiciales) -> Tuple:
        """Clasifica según tipo de sentencia"""
        
        # Caso 1: Prófugo de la justicia
        if judicial.estado_pena == "profugo":
            return (
                NivelCriticidad.ROJO,
                SubcategoriaNivel.SENTENCIA_FIRME_PROFUGO,
                f"⚠️ CANDIDATO CON SENTENCIA FIRME POR {self._normalizar_delito(judicial.delito)} - SE ENCUENTRA PRÓFUGO DE LA JUSTICIA"
            )
        
        # Caso 2: Prisión domiciliaria
        if judicial.estado_pena == "domiciliaria":
            return (
                NivelCriticidad.ROJO,
                SubcategoriaNivel.SENTENCIA_FIRME_DOMICILIARIA,
                f"⚠️ CANDIDATO CONDENADO POR {self._normalizar_delito(judicial.delito)} - CUMPLE PRISIÓN DOMICILIARIA"
            )
        
        # Caso 3: Delitos inhabilitantes (corrupción, crimen organizado)
        if judicial.delito and any(d in judicial.delito.lower() for d in self.DELITOS_INHABILITANTES):
            return (
                NivelCriticidad.ROJO,
                SubcategoriaNivel.SENTENCIA_FIRME_CORRUPCION,
                f"🔴 CANDIDATO SENTENCIADO POR {self._normalizar_delito(judicial.delito).upper()} - INHABILITADO PARA POSTULAR SEGÚN LEY"
            )
        
        # Caso 4: Delitos graves (violencia familiar, etc.)
        if judicial.delito and any(d in judicial.delito.lower() for d in self.DELITOS_GRAVES):
            return (
                NivelCriticidad.ROJO,
                SubcategoriaNivel.SENTENCIA_FIRME_VIOLENCIA,
                f"⚠️ CANDIDATO CONDENADO POR {self._normalizar_delito(judicial.delito)} - ANTECEDENTE GRAVE"
            )
        
        # Caso 5: Otros delitos
        return (
            NivelCriticidad.ROJO,
            SubcategoriaNivel.SENTENCIA_FIRME_CORRUPCION,
            f"🔴 CANDIDATO CON SENTENCIA FIRME POR {self._normalizar_delito(judicial.delito)}"
        )
    
    # ==========================================
    # CLASIFICACIÓN NIVEL NARANJA (PROCESOS ACTIVOS)
    # ==========================================
    
    def _tiene_proceso_activo(self, judicial: DatosJudiciales) -> bool:
        """Detecta si tiene proceso judicial activo"""
        return judicial.proceso_activo
    
    def _clasificar_proceso_activo(self, judicial: DatosJudiciales) -> Tuple:
        """Clasifica según etapa del proceso"""
        
        # Caso 1: Juicio oral (más avanzado)
        if judicial.etapa_proceso == "juicio_oral":
            return (
                NivelCriticidad.NARANJA,
                SubcategoriaNivel.PROCESO_JUICIO_ORAL,
                f"⚠️ CANDIDATO EN JUICIO ORAL POR {self._normalizar_delito(judicial.delito)} - SENTENCIA PRÓXIMA"
            )
        
        # Caso 2: Investigación fiscal
        if judicial.etapa_proceso == "investigacion":
            return (
                NivelCriticidad.NARANJA,
                SubcategoriaNivel.INVESTIGACION_FISCAL,
                f"⚠️ CANDIDATO INVESTIGADO POR FISCALÍA POR {self._normalizar_delito(judicial.delito)} - CASO EN CURSO"
            )
        
        # Caso 3: Apelación (sentencia no firme)
        if judicial.etapa_proceso == "apelacion":
            return (
                NivelCriticidad.NARANJA,
                SubcategoriaNivel.SENTENCIA_APELACION,
                f"⚠️ CANDIDATO CON CONDENA EN PRIMERA INSTANCIA POR {self._normalizar_delito(judicial.delito)} - APELA"
            )
        
        # Caso genérico
        return (
            NivelCriticidad.NARANJA,
            SubcategoriaNivel.PROCESO_JUICIO_ORAL,
            f"⚠️ CANDIDATO CON PROCESO JUDICIAL ACTIVO POR {self._normalizar_delito(judicial.delito)}"
        )
    
    # ==========================================
    # CLASIFICACIÓN NIVEL NARANJA (ALERTAS ECONÓMICAS)
    # ==========================================
    
    def _detectar_alertas_economicas(self, eco: DatosEconomicos) -> List[Dict]:
        """Detecta todas las alertas económicas"""
        alertas = []
        
        # Alerta 1: Variación patrimonial alta
        if eco.variacion_patrimonial > self.UMBRAL_VARIACION_PATRIMONIAL_ALTA:
            alertas.append({
                "tipo": "variacion_patrimonial_alta",
                "valor": f"+{eco.variacion_patrimonial:.1f}%",
                "descripcion": f"Patrimonio aumentó {eco.variacion_patrimonial:.1f}% sin justificación clara",
                "fuente": "CGR - Declaraciones Juradas",
                "gravedad": "alta"
            })
        elif eco.variacion_patrimonial > self.UMBRAL_VARIACION_PATRIMONIAL_MEDIA:
            alertas.append({
                "tipo": "variacion_patrimonial_media",
                "valor": f"+{eco.variacion_patrimonial:.1f}%",
                "descripcion": f"Patrimonio aumentó {eco.variacion_patrimonial:.1f}% - requiere explicación",
                "fuente": "CGR - Declaraciones Juradas",
                "gravedad": "media"
            })
        
        # Alerta 2: Concentración de aportes
        if eco.concentracion_top3 > self.UMBRAL_CONCENTRACION_APORTES_PELIGROSA:
            alertas.append({
                "tipo": "concentracion_aportes_peligrosa",
                "valor": f"{eco.concentracion_top3:.1f}%",
                "descripcion": f"{eco.concentracion_top3:.1f}% de aportes vienen de 3 empresas o personas",
                "fuente": "ONPE - CLARIDAD",
                "gravedad": "alta"
            })
        elif eco.concentracion_top3 > self.UMBRAL_CONCENTRACION_APORTES_ALERTA:
            alertas.append({
                "tipo": "concentracion_aportes_alerta",
                "valor": f"{eco.concentracion_top3:.1f}%",
                "descripcion": f"{eco.concentracion_top3:.1f}% de aportes concentrados en pocos aportantes",
                "fuente": "ONPE - CLARIDAD",
                "gravedad": "media"
            })
        
        # Alerta 3: Contratos a familiares
        if eco.tiene_contratos_familiares:
            alertas.append({
                "tipo": "contratos_familiares",
                "valor": "Sí",
                "descripcion": "Contratos estatales adjudicados a familiares del candidato",
                "fuente": "Portal Transparencia + CGR",
                "gravedad": "alta"
            })
        
        return alertas
    
    def _clasificar_alertas_economicas(self, eco: DatosEconomicos, alertas: List[Dict]) -> Tuple:
        """Clasifica según alertas económicas detectadas"""
        
        # Contar alertas por gravedad
        alertas_altas = [a for a in alertas if a.get("gravedad") == "alta"]
        
        if len(alertas_altas) >= 2:
            mensaje = f"⚠️ ALERTAS ECONÓMICAS GRAVES: {len(alertas_altas)} irregularidades detectadas"
        elif len(alertas_altas) == 1:
            mensaje = f"⚠️ ALERTA ECONÓMICA GRAVE: {alertas_altas[0]['descripcion']}"
        else:
            mensaje = "⚠️ ALERTAS ECONÓMICAS DETECTADAS - REVISAR DETALLES"
        
        return (
            NivelCriticidad.NARANJA,
            SubcategoriaNivel.ALERTAS_ECONOMICAS,
            mensaje
        )
    
    # ==========================================
    # CLASIFICACIÓN NIVEL AMARILLO (HISTORIAL)
    # ==========================================
    
    def _tiene_historial_publico(self, hist: DatosHistorial) -> bool:
        """Detecta si tiene historial público relevante"""
        return hist.fue_congresista or hist.fue_funcionario or hist.fue_alcalde or hist.fue_gobernador
    
    def _clasificar_historial(self, hist: DatosHistorial) -> Tuple:
        """Clasifica según historial público"""
        
        # Caso: Ex congresista con baja asistencia
        if hist.fue_congresista and hist.asistencia_congreso and hist.asistencia_congreso < self.UMBRAL_ASISTENCIA_CONGRESO_BAJA:
            return (
                NivelCriticidad.AMARILLO,
                SubcategoriaNivel.HISTORIAL_PUBLICO,
                f"ℹ️ EX CONGRESISTA - Asistencia a sesiones: {hist.asistencia_congreso:.1f}% (baja)"
            )
        
        # Caso: Ex congresista
        if hist.fue_congresista:
            return (
                NivelCriticidad.AMARILLO,
                SubcategoriaNivel.HISTORIAL_PUBLICO,
                f"ℹ️ EX CONGRESISTA - Proyectos presentados: {hist.proyectos_presentados}, Leyes aprobadas: {hist.leyes_aprobadas}"
            )
        
        # Caso: Ex funcionario
        if hist.fue_funcionario:
            return (
                NivelCriticidad.AMARILLO,
                SubcategoriaNivel.HISTORIAL_PUBLICO,
                "ℹ️ EX FUNCIONARIO PÚBLICO - Consultar historial de gestión en Portal Transparencia"
            )
        
        # Caso genérico
        return (
            NivelCriticidad.AMARILLO,
            SubcategoriaNivel.HISTORIAL_PUBLICO,
            "ℹ️ CON HISTORIAL PÚBLICO - Ver detalles completos para evaluar trayectoria"
        )
    
    # ==========================================
    # CLASIFICACIÓN NIVEL VERDE (BASE)
    # ==========================================
    
    def _clasificar_base(self) -> Tuple:
        """Clasificación base (sin alertas)"""
        return (
            NivelCriticidad.VERDE,
            SubcategoriaNivel.BASE,
            "✅ Sin alertas - Información básica disponible. Consulte plan de gobierno y hoja de vida."
        )
    
    # ==========================================
    # CÁLCULO DE PUNTAJE DE TRANSPARENCIA
    # ==========================================
    
    def _calcular_puntaje_transparencia(self, candidato: CandidatoCompleto) -> int:
        """
        Calcula puntaje de transparencia (0-100)
        Basado en completitud de datos y ausencia de alertas
        """
        puntaje = 0
        
        # Componente 1: Declaraciones completas (30 puntos)
        if candidato.biograficos:
            puntaje += 15
        if candidato.formacion and candidato.formacion.titulo:
            puntaje += 15
        
        # Componente 2: Sin procesos judiciales (20 puntos)
        if not candidato.judiciales.tiene_sentencia_firme and not candidato.judiciales.proceso_activo:
            puntaje += 20
        elif not candidato.judiciales.tiene_sentencia_firme:
            puntaje += 10  # Solo proceso activo
        
        # Componente 3: Variación patrimonial controlada (20 puntos)
        if candidato.economicos.variacion_patrimonial < 50:
            puntaje += 20
        elif candidato.economicos.variacion_patrimonial < 100:
            puntaje += 10
        
        # Componente 4: Aportes diversificados (15 puntos)
        if candidato.economicos.concentracion_top3 < 20:
            puntaje += 15
        elif candidato.economicos.concentracion_top3 < 30:
            puntaje += 7
        
        # Componente 5: Desempeño público (15 puntos)
        if candidato.historial.fue_congresista:
            if candidato.historial.asistencia_congreso and candidato.historial.asistencia_congreso >= 80:
                puntaje += 15
            elif candidato.historial.asistencia_congreso and candidato.historial.asistencia_congreso >= 70:
                puntaje += 7
        else:
            puntaje += 10  # No aplica, puntaje base
        
        return min(puntaje, 100)  # Máximo 100
    
    # ==========================================
    # MÉTODOS AUXILIARES
    # ==========================================
    
    def _nivel_a_color(self, nivel: NivelCriticidad) -> str:
        """Convierte nivel a color hexadecimal"""
        colores = {
            NivelCriticidad.VERDE: "verde",
            NivelCriticidad.AMARILLO: "amarillo",
            NivelCriticidad.NARANJA: "naranja",
            NivelCriticidad.ROJO: "rojo"
        }
        return colores.get(nivel, "gris")
    
    def _normalizar_delito(self, delito: Optional[str]) -> str:
        """Normaliza el nombre del delito para mensajes"""
        if not delito:
            return "DELITO"
        
        # Mapeo de términos comunes
        mapeo = {
            "colusion": "COLUSIÓN",
            "peculado": "PECULADO",
            "cohecho": "COHECHO",
            "lavado": "LAVADO DE ACTIVOS",
            "violencia familiar": "VIOLENCIA FAMILIAR"
        }
        
        delito_lower = delito.lower()
        for key, value in mapeo.items():
            if key in delito_lower:
                return value
        
        return delito.upper()
    
    def _esta_inhabilitado(self, judicial: DatosJudiciales) -> bool:
        """Determina si el candidato está inhabilitado para postular"""
        if not judicial.tiene_sentencia_firme:
            return False
        
        if judicial.estado_pena == "profugo":
            return True
        
        if judicial.delito and any(d in judicial.delito.lower() for d in self.DELITOS_INHABILITANTES):
            return True
        
        return False


# Instancia global del clasificador
clasificador = ClasificadorCandidatos()