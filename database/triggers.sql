-- =====================================================
-- FUNCIONES Y TRIGGERS PARA CLASIFICACIÓN AUTOMÁTICA
-- =====================================================

-- =====================================================
-- FUNCIÓN PRINCIPAL: CLASIFICAR CANDIDATO
-- Esta función se ejecuta automáticamente al INSERT o UPDATE
-- =====================================================

CREATE OR REPLACE FUNCTION clasificar_candidato()
RETURNS TRIGGER AS $$
DECLARE
    v_alertas JSONB := '[]'::jsonb;
    v_puntaje INTEGER := 0;
    v_nivel VARCHAR(10);
    v_color VARCHAR(10);
    v_subcategoria VARCHAR(50);
    v_mensaje TEXT;
    v_inhabilitado BOOLEAN := FALSE;
BEGIN
    -- =================================================
    -- PASO 1: DETECTAR ALERTAS ECONÓMICAS
    -- =================================================
    
    -- Alerta: Variación patrimonial alta (>100%)
    IF NEW.variacion_patrimonial > 100 THEN
        v_alertas := v_alertas || jsonb_build_object(
            'tipo', 'variacion_patrimonial_alta',
            'valor', NEW.variacion_patrimonial,
            'descripcion', 'Patrimonio aumentó ' || NEW.variacion_patrimonial || '% sin justificación clara',
            'fuente', 'CGR - Declaraciones Juradas',
            'gravedad', 'alta'
        );
    -- Alerta: Variación patrimonial media (50-100%)
    ELSIF NEW.variacion_patrimonial > 50 THEN
        v_alertas := v_alertas || jsonb_build_object(
            'tipo', 'variacion_patrimonial_media',
            'valor', NEW.variacion_patrimonial,
            'descripcion', 'Patrimonio aumentó ' || NEW.variacion_patrimonial || '% - requiere explicación',
            'fuente', 'CGR - Declaraciones Juradas',
            'gravedad', 'media'
        );
    END IF;
    
    -- Alerta: Concentración de aportes peligrosa (>30%)
    IF NEW.concentracion_top3 > 30 THEN
        v_alertas := v_alertas || jsonb_build_object(
            'tipo', 'concentracion_aportes_peligrosa',
            'valor', NEW.concentracion_top3,
            'descripcion', NEW.concentracion_top3 || '% de aportes vienen de 3 empresas o personas',
            'fuente', 'ONPE - CLARIDAD',
            'gravedad', 'alta'
        );
    -- Alerta: Concentración de aportes alerta (20-30%)
    ELSIF NEW.concentracion_top3 > 20 THEN
        v_alertas := v_alertas || jsonb_build_object(
            'tipo', 'concentracion_aportes_alerta',
            'valor', NEW.concentracion_top3,
            'descripcion', NEW.concentracion_top3 || '% de aportes concentrados en pocos aportantes',
            'fuente', 'ONPE - CLARIDAD',
            'gravedad', 'media'
        );
    END IF;
    
    -- Alerta: Contratos a familiares
    IF NEW.tiene_contratos_familiares THEN
        v_alertas := v_alertas || jsonb_build_object(
            'tipo', 'contratos_familiares',
            'valor', 'Sí',
            'descripcion', 'Contratos estatales adjudicados a familiares del candidato',
            'fuente', 'Portal Transparencia + CGR',
            'gravedad', 'alta'
        );
    END IF;
    
    -- =================================================
    -- PASO 2: CALCULAR PUNTAJE DE TRANSPARENCIA (0-100)
    -- =================================================
    
    -- Componente 1: Declaraciones completas (30 puntos)
    IF NEW.universidad IS NOT NULL THEN
        v_puntaje := v_puntaje + 15;
    END IF;
    IF NEW.titulo IS NOT NULL THEN
        v_puntaje := v_puntaje + 15;
    END IF;
    
    -- Componente 2: Sin procesos judiciales (20 puntos)
    IF NEW.tiene_sentencia_firme = FALSE AND NEW.proceso_activo = FALSE THEN
        v_puntaje := v_puntaje + 20;
    ELSIF NEW.tiene_sentencia_firme = FALSE THEN
        v_puntaje := v_puntaje + 10;
    END IF;
    
    -- Componente 3: Variación patrimonial controlada (20 puntos)
    IF NEW.variacion_patrimonial < 50 THEN
        v_puntaje := v_puntaje + 20;
    ELSIF NEW.variacion_patrimonial < 100 THEN
        v_puntaje := v_puntaje + 10;
    END IF;
    
    -- Componente 4: Aportes diversificados (15 puntos)
    IF NEW.concentracion_top3 < 20 THEN
        v_puntaje := v_puntaje + 15;
    ELSIF NEW.concentracion_top3 < 30 THEN
        v_puntaje := v_puntaje + 7;
    END IF;
    
    -- Componente 5: Desempeño público (15 puntos)
    IF NEW.fue_congresista THEN
        IF NEW.asistencia_congreso >= 80 THEN
            v_puntaje := v_puntaje + 15;
        ELSIF NEW.asistencia_congreso >= 70 THEN
            v_puntaje := v_puntaje + 7;
        END IF;
    ELSE
        v_puntaje := v_puntaje + 10;
    END IF;
    
    -- Limitar a 100
    v_puntaje := LEAST(v_puntaje, 100);
    
    -- =================================================
    -- PASO 3: CLASIFICACIÓN POR JERARQUÍA
    -- =================================================
    
    -- NIVEL ROJO (prioridad máxima)
    IF NEW.tiene_sentencia_firme THEN
        
        -- Subcaso: Prófugo
        IF NEW.estado_pena = 'profugo' THEN
            v_nivel := 'rojo';
            v_color := 'rojo';
            v_subcategoria := 'sentencia_firme_profugo';
            v_mensaje := '⚠️ CANDIDATO CON SENTENCIA FIRME POR ' || UPPER(COALESCE(NEW.delito, 'DELITO')) || ' - SE ENCUENTRA PRÓFUGO DE LA JUSTICIA';
            v_inhabilitado := TRUE;
        
        -- Subcaso: Prisión domiciliaria
        ELSIF NEW.estado_pena = 'domiciliaria' THEN
            v_nivel := 'rojo';
            v_color := 'rojo';
            v_subcategoria := 'sentencia_firme_domiciliaria';
            v_mensaje := '⚠️ CANDIDATO CONDENADO POR ' || UPPER(COALESCE(NEW.delito, 'DELITO')) || ' - CUMPLE PRISIÓN DOMICILIARIA';
            v_inhabilitado := TRUE;
        
        -- Subcaso: Violencia familiar
        ELSIF NEW.delito ILIKE '%violencia familiar%' THEN
            v_nivel := 'rojo';
            v_color := 'rojo';
            v_subcategoria := 'sentencia_firme_violencia';
            v_mensaje := '⚠️ CANDIDATO CONDENADO POR VIOLENCIA FAMILIAR - SENTENCIA FIRME';
            v_inhabilitado := FALSE;
        
        -- Subcaso: Delitos inhabilitantes (corrupción, crimen organizado)
        ELSIF NEW.delito ILIKE '%corrupcion%' OR 
              NEW.delito ILIKE '%colusion%' OR
              NEW.delito ILIKE '%peculado%' OR
              NEW.delito ILIKE '%cohecho%' OR
              NEW.delito ILIKE '%crimen organizado%' OR
              NEW.delito ILIKE '%lavado%' THEN
            v_nivel := 'rojo';
            v_color := 'rojo';
            v_subcategoria := 'sentencia_firme_corrupcion';
            v_mensaje := '🔴 CANDIDATO SENTENCIADO POR ' || UPPER(COALESCE(NEW.delito, 'CORRUPCIÓN')) || ' - INHABILITADO PARA POSTULAR';
            v_inhabilitado := TRUE;
        
        -- Subcaso: Otros delitos
        ELSE
            v_nivel := 'rojo';
            v_color := 'rojo';
            v_subcategoria := 'sentencia_firme_corrupcion';
            v_mensaje := '🔴 CANDIDATO CON SENTENCIA FIRME POR ' || UPPER(COALESCE(NEW.delito, 'DELITO'));
            v_inhabilitado := TRUE;
        END IF;
    
    -- NIVEL NARANJA (procesos activos)
    ELSIF NEW.proceso_activo THEN
        
        -- Subcaso: Juicio oral
        IF NEW.etapa_proceso = 'juicio_oral' THEN
            v_nivel := 'naranja';
            v_color := 'naranja';
            v_subcategoria := 'proceso_juicio_oral';
            v_mensaje := '⚠️ CANDIDATO EN JUICIO ORAL POR ' || UPPER(COALESCE(NEW.delito, 'DELITO')) || ' - SENTENCIA PRÓXIMA';
        
        -- Subcaso: Investigación fiscal
        ELSIF NEW.etapa_proceso = 'investigacion' THEN
            v_nivel := 'naranja';
            v_color := 'naranja';
            v_subcategoria := 'investigacion_fiscal';
            v_mensaje := '⚠️ CANDIDATO INVESTIGADO POR FISCALÍA POR ' || UPPER(COALESCE(NEW.delito, 'DELITO')) || ' - CASO EN CURSO';
        
        -- Subcaso: Apelación
        ELSIF NEW.etapa_proceso = 'apelacion' THEN
            v_nivel := 'naranja';
            v_color := 'naranja';
            v_subcategoria := 'sentencia_apelacion';
            v_mensaje := '⚠️ CANDIDATO CON CONDENA EN PRIMERA INSTANCIA POR ' || UPPER(COALESCE(NEW.delito, 'DELITO')) || ' - APELA';
        
        ELSE
            v_nivel := 'naranja';
            v_color := 'naranja';
            v_subcategoria := 'proceso_activo';
            v_mensaje := '⚠️ CANDIDATO CON PROCESO JUDICIAL ACTIVO';
        END IF;
    
    -- NIVEL NARANJA (alertas económicas)
    ELSIF jsonb_array_length(v_alertas) > 0 THEN
        
        -- Contar alertas de gravedad alta
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(v_alertas) AS alerta
            WHERE alerta->>'gravedad' = 'alta'
        ) THEN
            v_nivel := 'naranja';
            v_color := 'naranja';
            v_subcategoria := 'alertas_economicas';
            v_mensaje := '⚠️ ALERTAS ECONÓMICAS GRAVES DETECTADAS - REVISAR DETALLES';
        ELSE
            v_nivel := 'naranja';
            v_color := 'naranja';
            v_subcategoria := 'alertas_economicas';
            v_mensaje := '⚠️ ALERTAS ECONÓMICAS DETECTADAS - REQUIERE ESCLARECIMIENTO';
        END IF;
    
    -- NIVEL AMARILLO (historial público)
    ELSIF NEW.fue_congresista OR NEW.fue_funcionario OR NEW.fue_alcalde OR NEW.fue_gobernador THEN
        
        v_nivel := 'amarillo';
        v_color := 'amarillo';
        v_subcategoria := 'historial_publico';
        
        -- Mensaje específico según el caso
        IF NEW.fue_congresista AND NEW.asistencia_congreso < 70 THEN
            v_mensaje := 'ℹ️ EX CONGRESISTA - Asistencia a sesiones: ' || NEW.asistencia_congreso || '% (baja)';
        ELSIF NEW.fue_congresista THEN
            v_mensaje := 'ℹ️ EX CONGRESISTA - Proyectos presentados: ' || NEW.proyectos_presentados || ', Leyes aprobadas: ' || NEW.leyes_aprobadas;
        ELSIF NEW.fue_funcionario THEN
            v_mensaje := 'ℹ️ EX FUNCIONARIO PÚBLICO - Consultar historial de gestión en Portal Transparencia';
        ELSE
            v_mensaje := 'ℹ️ CON HISTORIAL PÚBLICO - Ver detalles completos para evaluar trayectoria';
        END IF;
    
    -- NIVEL VERDE (base)
    ELSE
        v_nivel := 'verde';
        v_color := 'verde';
        v_subcategoria := 'base';
        v_mensaje := '✅ Sin alertas - Información básica disponible. Consulte plan de gobierno y hoja de vida.';
    END IF;
    
    -- =================================================
    -- PASO 4: ASIGNAR VALORES CALCULADOS
    -- =================================================
    
    NEW.nivel_criticidad := v_nivel;
    NEW.color := v_color;
    NEW.subcategoria := v_subcategoria;
    NEW.mensaje_ciudadano := v_mensaje;
    NEW.inhabilitado := v_inhabilitado;
    NEW.alertas_activas := v_alertas;
    NEW.puntaje_transparencia := v_puntaje;
    NEW.ultima_actualizacion := NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER: CLASIFICACIÓN AUTOMÁTICA AL INSERTAR/ACTUALIZAR
-- =====================================================

DROP TRIGGER IF EXISTS trigger_clasificar_candidato ON candidatos;

CREATE TRIGGER trigger_clasificar_candidato
    BEFORE INSERT OR UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION clasificar_candidato();

-- =====================================================
-- TRIGGER: ACTUALIZAR TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_timestamp_candidatos ON candidatos;
CREATE TRIGGER trigger_actualizar_timestamp_candidatos
    BEFORE UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp();

DROP TRIGGER IF EXISTS trigger_actualizar_timestamp_partidos ON partidos;
CREATE TRIGGER trigger_actualizar_timestamp_partidos
    BEFORE UPDATE ON partidos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp();

-- =====================================================
-- FUNCIÓN: ACTUALIZAR ESTADÍSTICAS DE PARTIDOS
-- =====================================================

CREATE OR REPLACE FUNCTION actualizar_estadisticas_partido()
RETURNS TRIGGER AS $$
DECLARE
    v_stats RECORD;
BEGIN
    -- Calcular estadísticas del partido
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE nivel_criticidad = 'verde') as verde,
        COUNT(*) FILTER (WHERE nivel_criticidad = 'amarillo') as amarillo,
        COUNT(*) FILTER (WHERE nivel_criticidad = 'naranja') as naranja,
        COUNT(*) FILTER (WHERE nivel_criticidad = 'rojo') as rojo,
        AVG(puntaje_transparencia) as score_promedio
    INTO v_stats
    FROM candidatos
    WHERE partido = NEW.partido;
    
    -- Actualizar partido
    UPDATE partidos SET
        total_candidatos = v_stats.total,
        candidatos_verde = v_stats.verde,
        candidatos_amarillo = v_stats.amarillo,
        candidatos_naranja = v_stats.naranja,
        candidatos_rojo = v_stats.rojo,
        score_transparencia_promedio = v_stats.score_promedio,
        updated_at = NOW()
    WHERE nombre = NEW.partido;
    
    -- Si no existe, insertar
    IF NOT FOUND THEN
        INSERT INTO partidos (nombre, total_candidatos, candidatos_verde, candidatos_amarillo, candidatos_naranja, candidatos_rojo, score_transparencia_promedio)
        VALUES (NEW.partido, v_stats.total, v_stats.verde, v_stats.amarillo, v_stats.naranja, v_stats.rojo, v_stats.score_promedio);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_actualizar_partidos ON candidatos;

CREATE TRIGGER trigger_actualizar_partidos
    AFTER INSERT OR UPDATE OF partido, nivel_criticidad, puntaje_transparencia ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_estadisticas_partido();

-- =====================================================
-- FUNCIÓN: REGISTRAR AUDITORÍA
-- =====================================================

CREATE OR REPLACE FUNCTION registrar_auditoria()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo registrar cambios importantes
    IF OLD.nivel_criticidad IS DISTINCT FROM NEW.nivel_criticidad THEN
        INSERT INTO auditoria_candidatos (candidato_dni, campo_modificado, valor_anterior, valor_nuevo, fuente_modificacion)
        VALUES (NEW.dni, 'nivel_criticidad', OLD.nivel_criticidad, NEW.nivel_criticidad, 'clasificador_automatico');
    END IF;
    
    IF OLD.puntaje_transparencia IS DISTINCT FROM NEW.puntaje_transparencia THEN
        INSERT INTO auditoria_candidatos (candidato_dni, campo_modificado, valor_anterior, valor_nuevo, fuente_modificacion)
        VALUES (NEW.dni, 'puntaje_transparencia', OLD.puntaje_transparencia::text, NEW.puntaje_transparencia::text, 'clasificador_automatico');
    END IF;
    
    IF OLD.inhabilitado IS DISTINCT FROM NEW.inhabilitado THEN
        INSERT INTO auditoria_candidatos (candidato_dni, campo_modificado, valor_anterior, valor_nuevo, fuente_modificacion)
        VALUES (NEW.dni, 'inhabilitado', OLD.inhabilitado::text, NEW.inhabilitado::text, 'clasificador_automatico');
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_registrar_auditoria ON candidatos;

CREATE TRIGGER trigger_registrar_auditoria
    AFTER UPDATE ON candidatos
    FOR EACH ROW
    EXECUTE FUNCTION registrar_auditoria();