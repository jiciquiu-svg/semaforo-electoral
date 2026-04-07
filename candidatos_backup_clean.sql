--
-- PostgreSQL database dump
--

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pg_trgm; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;


--
-- Name: EXTENSION pg_trgm; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pg_trgm IS 'text similarity measurement and index searching based on trigrams';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: actualizar_estadisticas_partido(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.actualizar_estadisticas_partido() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.actualizar_estadisticas_partido() OWNER TO postgres;

--
-- Name: actualizar_timestamp(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.actualizar_timestamp() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION public.actualizar_timestamp() OWNER TO postgres;

--
-- Name: clasificar_candidato(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.clasificar_candidato() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.clasificar_candidato() OWNER TO postgres;

--
-- Name: registrar_auditoria(); Type: FUNCTION; Schema: public; Owner: admin
--

CREATE FUNCTION public.registrar_auditoria() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
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
$$;


ALTER FUNCTION public.registrar_auditoria() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: antecedentes_judiciales; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.antecedentes_judiciales (
    id integer NOT NULL,
    candidato_dni character varying(15),
    tipo character varying(50),
    delito character varying(200),
    numero_expediente character varying(50),
    juzgado character varying(200),
    fiscalia character varying(200),
    fecha_inicio date,
    fecha_sentencia date,
    estado character varying(50),
    pena character varying(200),
    url_fuente text,
    fecha_extraccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.antecedentes_judiciales OWNER TO postgres;

--
-- Name: antecedentes_judiciales_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.antecedentes_judiciales_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.antecedentes_judiciales_id_seq OWNER TO postgres;

--
-- Name: antecedentes_judiciales_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.antecedentes_judiciales_id_seq OWNED BY public.antecedentes_judiciales.id;


--
-- Name: aportantes; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.aportantes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidato_dni character varying(8),
    nombre_aportante character varying(200) NOT NULL,
    tipo_aportante character varying(20),
    ruc_dni character varying(20),
    monto numeric(15,2) NOT NULL,
    fecha_aporte date,
    es_sospechoso boolean DEFAULT false,
    motivo_sospecha text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT aportantes_tipo_aportante_check CHECK (((tipo_aportante)::text = ANY ((ARRAY['persona_natural'::character varying, 'persona_juridica'::character varying])::text[])))
);


ALTER TABLE public.aportantes OWNER TO postgres;

--
-- Name: aportes_campana; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.aportes_campana (
    id integer NOT NULL,
    candidato_dni character varying(15),
    aportante_nombre character varying(200),
    aportante_tipo character varying(30),
    aportante_ruc_dni character varying(20),
    monto numeric(12,2),
    fecha_aporte date,
    tipo_aporte character varying(50),
    es_sospechoso boolean DEFAULT false,
    url_fuente text,
    fecha_extraccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.aportes_campana OWNER TO postgres;

--
-- Name: aportes_campana_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.aportes_campana_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.aportes_campana_id_seq OWNER TO postgres;

--
-- Name: aportes_campana_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.aportes_campana_id_seq OWNED BY public.aportes_campana.id;


--
-- Name: auditoria_candidatos; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.auditoria_candidatos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidato_dni character varying(8),
    campo_modificado character varying(100),
    valor_anterior text,
    valor_nuevo text,
    fuente_modificacion character varying(200),
    usuario character varying(100),
    ip_address inet,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.auditoria_candidatos OWNER TO postgres;

--
-- Name: candidatos; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.candidatos (
    id integer NOT NULL,
    dni character varying(8) NOT NULL,
    nombres_completos text NOT NULL,
    partido text NOT NULL,
    cargo_postula character varying(50) NOT NULL,
    edad integer,
    profesion text,
    numero_cedula integer,
    estado_habilitado boolean DEFAULT true,
    fuente_datos text,
    hoja_vida_url text,
    plan_gobierno_url text,
    nivel_criticidad character varying(10) DEFAULT 'verde'::character varying,
    color character varying(10) DEFAULT 'verde'::character varying,
    mensaje_ciudadano text DEFAULT 'Información en verificación'::text,
    alertas_activas jsonb DEFAULT '[]'::jsonb,
    puntaje_transparencia integer DEFAULT 0,
    ultima_actualizacion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.candidatos OWNER TO postgres;

--
-- Name: candidatos_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.candidatos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidatos_id_seq OWNER TO postgres;

--
-- Name: candidatos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.candidatos_id_seq OWNED BY public.candidatos.id;


--
-- Name: declaraciones_juradas; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.declaraciones_juradas (
    id integer NOT NULL,
    candidato_dni character varying(15),
    fecha_declaracion date,
    patrimonio_total numeric(15,2),
    bienes_inmuebles jsonb,
    bienes_muebles jsonb,
    cuentas_bancarias jsonb,
    deudas jsonb,
    empresas_participacion jsonb,
    ingresos_anuales numeric(15,2),
    url_fuente text,
    fecha_extraccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.declaraciones_juradas OWNER TO postgres;

--
-- Name: declaraciones_juradas_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.declaraciones_juradas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.declaraciones_juradas_id_seq OWNER TO postgres;

--
-- Name: declaraciones_juradas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.declaraciones_juradas_id_seq OWNED BY public.declaraciones_juradas.id;


--
-- Name: donaciones; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.donaciones (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    usuario_email character varying(200),
    monto numeric(10,2) NOT NULL,
    metodo_pago character varying(20),
    estado character varying(20) DEFAULT 'pendiente'::character varying,
    fecha timestamp without time zone DEFAULT now(),
    CONSTRAINT donaciones_estado_check CHECK (((estado)::text = ANY ((ARRAY['pendiente'::character varying, 'completado'::character varying, 'fallido'::character varying])::text[]))),
    CONSTRAINT donaciones_metodo_pago_check CHECK (((metodo_pago)::text = ANY ((ARRAY['paypal'::character varying, 'tarjeta'::character varying, 'transferencia'::character varying])::text[])))
);


ALTER TABLE public.donaciones OWNER TO postgres;

--
-- Name: experiencia_laboral; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.experiencia_laboral (
    id integer NOT NULL,
    candidato_dni character varying(15),
    sector character varying(50),
    institucion character varying(200),
    cargo character varying(200),
    fecha_inicio date,
    fecha_fin date,
    funciones text,
    fuente character varying(200),
    fecha_extraccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.experiencia_laboral OWNER TO postgres;

--
-- Name: experiencia_laboral_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.experiencia_laboral_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.experiencia_laboral_id_seq OWNER TO postgres;

--
-- Name: experiencia_laboral_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.experiencia_laboral_id_seq OWNED BY public.experiencia_laboral.id;


--
-- Name: formacion_academica; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.formacion_academica (
    id integer NOT NULL,
    candidato_dni character varying(15),
    tipo character varying(50),
    institucion character varying(200),
    titulo character varying(200),
    grado character varying(50),
    anio_inicio integer,
    anio_fin integer,
    sunedu_registro character varying(50),
    fuente character varying(200),
    fecha_extraccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.formacion_academica OWNER TO postgres;

--
-- Name: formacion_academica_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.formacion_academica_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.formacion_academica_id_seq OWNER TO postgres;

--
-- Name: formacion_academica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.formacion_academica_id_seq OWNED BY public.formacion_academica.id;


--
-- Name: gestion_publica; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.gestion_publica (
    id integer NOT NULL,
    candidato_dni character varying(15),
    institucion character varying(200),
    cargo character varying(200),
    periodo character varying(100),
    fecha_extraccion timestamp without time zone DEFAULT now()
);


ALTER TABLE public.gestion_publica OWNER TO postgres;

--
-- Name: gestion_publica_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.gestion_publica_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.gestion_publica_id_seq OWNER TO postgres;

--
-- Name: gestion_publica_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.gestion_publica_id_seq OWNED BY public.gestion_publica.id;


--
-- Name: historial_cambios; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.historial_cambios (
    id integer NOT NULL,
    candidato_dni character varying(15),
    campo_modificado character varying(100),
    valor_anterior text,
    valor_nuevo text,
    fuente character varying(200),
    fecha_cambio timestamp without time zone DEFAULT now()
);


ALTER TABLE public.historial_cambios OWNER TO postgres;

--
-- Name: historial_cambios_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.historial_cambios_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.historial_cambios_id_seq OWNER TO postgres;

--
-- Name: historial_cambios_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.historial_cambios_id_seq OWNED BY public.historial_cambios.id;


--
-- Name: logs_busqueda; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.logs_busqueda (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    termino_busqueda character varying(200),
    resultados_encontrados integer,
    ip_address inet,
    user_agent text,
    fecha timestamp without time zone DEFAULT now()
);


ALTER TABLE public.logs_busqueda OWNER TO postgres;

--
-- Name: logs_extraccion; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.logs_extraccion (
    id integer NOT NULL,
    candidato_dni character varying(15),
    fuente character varying(100),
    estado character varying(20),
    mensaje text,
    fecha_intento timestamp without time zone DEFAULT now()
);


ALTER TABLE public.logs_extraccion OWNER TO postgres;

--
-- Name: logs_extraccion_id_seq; Type: SEQUENCE; Schema: public; Owner: admin
--

CREATE SEQUENCE public.logs_extraccion_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.logs_extraccion_id_seq OWNER TO postgres;

--
-- Name: logs_extraccion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: admin
--

ALTER SEQUENCE public.logs_extraccion_id_seq OWNED BY public.logs_extraccion.id;


--
-- Name: partidos; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.partidos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    nombre character varying(200) NOT NULL,
    alianza character varying(200),
    numero_inscripcion_jne character varying(50),
    fecha_inscripcion date,
    tiene_sentencias boolean DEFAULT false,
    sentencias jsonb,
    score_transparencia_promedio numeric(5,2),
    total_candidatos integer DEFAULT 0,
    candidatos_verde integer DEFAULT 0,
    candidatos_amarillo integer DEFAULT 0,
    candidatos_naranja integer DEFAULT 0,
    candidatos_rojo integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.partidos OWNER TO postgres;

--
-- Name: procesos_activos; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.procesos_activos (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidato_dni character varying(8),
    numero_expediente character varying(50) NOT NULL,
    delito_imputado character varying(200) NOT NULL,
    etapa character varying(20),
    fiscalia character varying(200),
    juzgado character varying(200),
    fecha_inicio date,
    estado character varying(20),
    enlace_fuente text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT procesos_activos_estado_check CHECK (((estado)::text = ANY ((ARRAY['activo'::character varying, 'suspendido'::character varying, 'archivado'::character varying])::text[]))),
    CONSTRAINT procesos_activos_etapa_check CHECK (((etapa)::text = ANY ((ARRAY['investigacion_preparatoria'::character varying, 'juicio_oral'::character varying, 'apelacion'::character varying, 'casacion'::character varying])::text[])))
);


ALTER TABLE public.procesos_activos OWNER TO postgres;

--
-- Name: sentencias; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.sentencias (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    candidato_dni character varying(8),
    numero_expediente character varying(50) NOT NULL,
    delito character varying(200) NOT NULL,
    fecha_sentencia date NOT NULL,
    juzgado character varying(200),
    pena text,
    estado_pena character varying(20),
    enlace_fuente text,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT sentencias_estado_pena_check CHECK (((estado_pena)::text = ANY ((ARRAY['profugo'::character varying, 'domiciliaria'::character varying, 'cumplida'::character varying, 'prision'::character varying])::text[])))
);


ALTER TABLE public.sentencias OWNER TO postgres;

--
-- Name: usuarios; Type: TABLE; Schema: public; Owner: admin
--

CREATE TABLE public.usuarios (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    email character varying(200) NOT NULL,
    nombre character varying(200),
    tipo_usuario character varying(20) DEFAULT 'ciudadano'::character varying,
    donaciones_totales numeric(10,2) DEFAULT 0.0,
    ultimo_acceso timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT usuarios_tipo_usuario_check CHECK (((tipo_usuario)::text = ANY ((ARRAY['ciudadano'::character varying, 'periodista'::character varying, 'investigador'::character varying, 'admin'::character varying])::text[])))
);


ALTER TABLE public.usuarios OWNER TO postgres;

--
-- Name: antecedentes_judiciales id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.antecedentes_judiciales ALTER COLUMN id SET DEFAULT nextval('public.antecedentes_judiciales_id_seq'::regclass);


--
-- Name: aportes_campana id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.aportes_campana ALTER COLUMN id SET DEFAULT nextval('public.aportes_campana_id_seq'::regclass);


--
-- Name: candidatos id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.candidatos ALTER COLUMN id SET DEFAULT nextval('public.candidatos_id_seq'::regclass);


--
-- Name: declaraciones_juradas id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.declaraciones_juradas ALTER COLUMN id SET DEFAULT nextval('public.declaraciones_juradas_id_seq'::regclass);


--
-- Name: experiencia_laboral id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.experiencia_laboral ALTER COLUMN id SET DEFAULT nextval('public.experiencia_laboral_id_seq'::regclass);


--
-- Name: formacion_academica id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.formacion_academica ALTER COLUMN id SET DEFAULT nextval('public.formacion_academica_id_seq'::regclass);


--
-- Name: gestion_publica id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.gestion_publica ALTER COLUMN id SET DEFAULT nextval('public.gestion_publica_id_seq'::regclass);


--
-- Name: historial_cambios id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.historial_cambios ALTER COLUMN id SET DEFAULT nextval('public.historial_cambios_id_seq'::regclass);


--
-- Name: logs_extraccion id; Type: DEFAULT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.logs_extraccion ALTER COLUMN id SET DEFAULT nextval('public.logs_extraccion_id_seq'::regclass);


--
-- Data for Name: antecedentes_judiciales; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.antecedentes_judiciales VALUES (1, '40703162', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-06 13:12:45.369043');
INSERT INTO public.antecedentes_judiciales VALUES (2, '40703162', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-06 13:15:20.625438');
INSERT INTO public.antecedentes_judiciales VALUES (3, '40703162', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-06 13:23:22.705023');
INSERT INTO public.antecedentes_judiciales VALUES (4, '40703162', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-06 21:53:12.712167');
INSERT INTO public.antecedentes_judiciales VALUES (5, '40703162', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-06 22:14:13.847087');
INSERT INTO public.antecedentes_judiciales VALUES (6, '00100001', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:14.579349');
INSERT INTO public.antecedentes_judiciales VALUES (7, '00100002', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:15.638112');
INSERT INTO public.antecedentes_judiciales VALUES (8, '00100003', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:16.686939');
INSERT INTO public.antecedentes_judiciales VALUES (9, '00100004', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:17.733705');
INSERT INTO public.antecedentes_judiciales VALUES (10, '00100005', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:18.768498');
INSERT INTO public.antecedentes_judiciales VALUES (11, '00100006', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:19.804178');
INSERT INTO public.antecedentes_judiciales VALUES (12, '00100007', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:20.852721');
INSERT INTO public.antecedentes_judiciales VALUES (13, '00100008', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:21.905328');
INSERT INTO public.antecedentes_judiciales VALUES (14, '00100009', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:22.952672');
INSERT INTO public.antecedentes_judiciales VALUES (15, '00100010', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:24.002297');
INSERT INTO public.antecedentes_judiciales VALUES (16, '00100011', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:25.052782');
INSERT INTO public.antecedentes_judiciales VALUES (17, '00100012', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:26.102776');
INSERT INTO public.antecedentes_judiciales VALUES (18, '00100013', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:27.154098');
INSERT INTO public.antecedentes_judiciales VALUES (19, '00100014', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:28.206877');
INSERT INTO public.antecedentes_judiciales VALUES (20, '00100015', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:29.254482');
INSERT INTO public.antecedentes_judiciales VALUES (21, '00100016', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:30.304364');
INSERT INTO public.antecedentes_judiciales VALUES (22, '00100017', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:31.348875');
INSERT INTO public.antecedentes_judiciales VALUES (23, '00100018', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:32.402075');
INSERT INTO public.antecedentes_judiciales VALUES (24, '00100019', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:33.451756');
INSERT INTO public.antecedentes_judiciales VALUES (25, '00100020', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:34.50416');
INSERT INTO public.antecedentes_judiciales VALUES (26, '00100021', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:35.550161');
INSERT INTO public.antecedentes_judiciales VALUES (27, '00100022', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:36.604286');
INSERT INTO public.antecedentes_judiciales VALUES (28, '00100023', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:37.651324');
INSERT INTO public.antecedentes_judiciales VALUES (29, '00100024', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:38.70431');
INSERT INTO public.antecedentes_judiciales VALUES (30, '00100025', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:39.755211');
INSERT INTO public.antecedentes_judiciales VALUES (31, '00100026', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:40.800397');
INSERT INTO public.antecedentes_judiciales VALUES (32, '00100027', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:41.850571');
INSERT INTO public.antecedentes_judiciales VALUES (33, '00100028', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:42.904261');
INSERT INTO public.antecedentes_judiciales VALUES (34, '00100029', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:43.951584');
INSERT INTO public.antecedentes_judiciales VALUES (35, '00100030', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:45.006166');
INSERT INTO public.antecedentes_judiciales VALUES (36, '00100031', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:46.064857');
INSERT INTO public.antecedentes_judiciales VALUES (37, '00100032', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:47.118516');
INSERT INTO public.antecedentes_judiciales VALUES (38, '00100033', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:48.169815');
INSERT INTO public.antecedentes_judiciales VALUES (39, '00100034', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:49.236671');
INSERT INTO public.antecedentes_judiciales VALUES (40, '00100035', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:50.283122');
INSERT INTO public.antecedentes_judiciales VALUES (41, '00100036', 'sentencia', 'Corrupción', 'EXP-001', NULL, NULL, NULL, NULL, 'Sentenciado', NULL, NULL, '2026-04-07 05:25:51.333661');


--
-- Data for Name: aportantes; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: aportes_campana; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.aportes_campana VALUES (1, '40703162', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-06 13:12:45.376874');
INSERT INTO public.aportes_campana VALUES (2, '40703162', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-06 13:15:20.632435');
INSERT INTO public.aportes_campana VALUES (3, '40703162', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-06 13:23:22.713698');
INSERT INTO public.aportes_campana VALUES (4, '40703162', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-06 21:53:12.723065');
INSERT INTO public.aportes_campana VALUES (5, '40703162', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-06 22:14:13.855361');
INSERT INTO public.aportes_campana VALUES (6, '00100001', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:14.590136');
INSERT INTO public.aportes_campana VALUES (7, '00100002', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:15.645949');
INSERT INTO public.aportes_campana VALUES (8, '00100003', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:16.694105');
INSERT INTO public.aportes_campana VALUES (9, '00100004', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:17.740446');
INSERT INTO public.aportes_campana VALUES (10, '00100005', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:18.774899');
INSERT INTO public.aportes_campana VALUES (11, '00100006', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:19.81091');
INSERT INTO public.aportes_campana VALUES (12, '00100007', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:20.860964');
INSERT INTO public.aportes_campana VALUES (13, '00100008', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:21.910711');
INSERT INTO public.aportes_campana VALUES (14, '00100009', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:22.959635');
INSERT INTO public.aportes_campana VALUES (15, '00100010', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:24.009787');
INSERT INTO public.aportes_campana VALUES (16, '00100011', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:25.060658');
INSERT INTO public.aportes_campana VALUES (17, '00100012', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:26.111063');
INSERT INTO public.aportes_campana VALUES (18, '00100013', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:27.162296');
INSERT INTO public.aportes_campana VALUES (19, '00100014', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:28.212032');
INSERT INTO public.aportes_campana VALUES (20, '00100015', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:29.262283');
INSERT INTO public.aportes_campana VALUES (21, '00100016', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:30.312022');
INSERT INTO public.aportes_campana VALUES (22, '00100017', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:31.357321');
INSERT INTO public.aportes_campana VALUES (23, '00100018', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:32.410203');
INSERT INTO public.aportes_campana VALUES (24, '00100019', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:33.462355');
INSERT INTO public.aportes_campana VALUES (25, '00100020', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:34.511967');
INSERT INTO public.aportes_campana VALUES (26, '00100021', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:35.559396');
INSERT INTO public.aportes_campana VALUES (27, '00100022', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:36.613864');
INSERT INTO public.aportes_campana VALUES (28, '00100023', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:37.659613');
INSERT INTO public.aportes_campana VALUES (29, '00100024', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:38.712204');
INSERT INTO public.aportes_campana VALUES (30, '00100025', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:39.763579');
INSERT INTO public.aportes_campana VALUES (31, '00100026', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:40.809185');
INSERT INTO public.aportes_campana VALUES (32, '00100027', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:41.856318');
INSERT INTO public.aportes_campana VALUES (33, '00100028', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:42.91223');
INSERT INTO public.aportes_campana VALUES (34, '00100029', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:43.962196');
INSERT INTO public.aportes_campana VALUES (35, '00100030', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:45.016969');
INSERT INTO public.aportes_campana VALUES (36, '00100031', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:46.073971');
INSERT INTO public.aportes_campana VALUES (37, '00100032', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:47.126085');
INSERT INTO public.aportes_campana VALUES (38, '00100033', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:48.183886');
INSERT INTO public.aportes_campana VALUES (39, '00100034', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:49.242274');
INSERT INTO public.aportes_campana VALUES (40, '00100035', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:50.292153');
INSERT INTO public.aportes_campana VALUES (41, '00100036', 'Empresa A', NULL, NULL, 10000.00, '2023-12-01', NULL, false, NULL, '2026-04-07 05:25:51.342137');


--
-- Data for Name: auditoria_candidatos; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: candidatos; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.candidatos VALUES (2, '00100002', 'César Acuña Peralta', 'Alianza para el Progreso', 'presidente', 70, 'Empresario educativo', 2, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:15.655282');
INSERT INTO public.candidatos VALUES (3, '00100003', 'Rafael López Aliaga', 'Renovación Popular', 'presidente', 61, 'Empresario', 3, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:16.700745');
INSERT INTO public.candidatos VALUES (4, '00100004', 'Roberto Sánchez Palomino', 'Juntos por el Perú', 'presidente', 57, 'Psicólogo', 4, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:17.746219');
INSERT INTO public.candidatos VALUES (5, '00100005', 'Carlos Jaico Arcas', 'Perú Moderno', 'presidente', 58, 'Abogado', 5, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:18.781776');
INSERT INTO public.candidatos VALUES (6, '00100006', 'José Luna Gálvez', 'Podemos Perú', 'presidente', 83, 'Abogado', 6, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:19.818255');
INSERT INTO public.candidatos VALUES (7, '00100007', 'Fernando Olivera Vega', 'Frente de la Esperanza', 'presidente', 65, 'Abogado', 7, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:20.861989');
INSERT INTO public.candidatos VALUES (8, '00100008', 'Mesías Guevara Amasifuén', 'Partido Morado', 'presidente', 63, 'Abogado', 8, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:21.918654');
INSERT INTO public.candidatos VALUES (9, '00100009', 'Yonhy Lescano Ancieta', 'Cooperación Popular', 'presidente', 72, 'Abogado', 9, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:22.962232');
INSERT INTO public.candidatos VALUES (10, '00100010', 'Mario Vizcarra Cornejo', 'Perú Primero', 'presidente', 63, 'Ingeniero', 10, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:24.012376');
INSERT INTO public.candidatos VALUES (11, '00100011', 'Vladimir Cerrón Rojas', 'Perú Libre', 'presidente', 49, 'Médico', 11, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:25.062197');
INSERT INTO public.candidatos VALUES (12, '00100012', 'José Williams Zapata', 'Avanza País', 'presidente', 72, 'Militar (r)', 12, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:26.117896');
INSERT INTO public.candidatos VALUES (13, '00100013', 'Rafael Belaunde Llosa', 'Libertad Popular', 'presidente', 51, 'Ingeniero', 13, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:27.170094');
INSERT INTO public.candidatos VALUES (14, '00100014', 'Carlos Espá Dávila', 'SíCreo', 'presidente', 65, 'Ingeniero agrónomo', 14, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:28.222926');
INSERT INTO public.candidatos VALUES (15, '00100015', 'Antonio Ortiz Villano', 'Salvemos al Perú', 'presidente', 70, 'Abogado', 15, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:29.270252');
INSERT INTO public.candidatos VALUES (16, '00100016', 'Fiorella Molinelli', 'Fuerza y Libertad', 'presidente', 52, 'Política', 16, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:30.320068');
INSERT INTO public.candidatos VALUES (17, '00100017', 'Enrique Valderrama', 'APRA', 'presidente', 60, 'Abogado', 17, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:31.362026');
INSERT INTO public.candidatos VALUES (18, '00100018', 'Alex Gonzales Castillo', 'Demócrata Verde', 'presidente', 45, 'Empresario', 18, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:32.417175');
INSERT INTO public.candidatos VALUES (19, '00100019', 'Roberto Chiabra', 'Unidad Nacional', 'presidente', 58, 'Empresario', 19, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:33.471059');
INSERT INTO public.candidatos VALUES (20, '00100020', 'Paul Jaimes', 'Progresemos', 'presidente', 52, 'Abogado', 20, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:34.520205');
INSERT INTO public.candidatos VALUES (21, '00100021', 'Alfonso López Chau', 'Ahora Nación', 'presidente', 59, 'Ingeniero', 21, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:35.568942');
INSERT INTO public.candidatos VALUES (22, '00100022', 'Ronald Atencio', 'Alianza Venceremos', 'presidente', 50, 'Abogado', 22, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:36.622973');
INSERT INTO public.candidatos VALUES (23, '00100023', 'George Forsyth', 'Somos Perú', 'presidente', 43, 'Empresario', 23, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:37.66713');
INSERT INTO public.candidatos VALUES (24, '00100024', 'Carlos Álvarez', 'País para Todos', 'presidente', 55, 'Comunicador', 24, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:38.720152');
INSERT INTO public.candidatos VALUES (25, '00100025', 'Francisco Diez Canseco', 'Perú Acción', 'presidente', 79, 'Abogado', 25, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:39.771306');
INSERT INTO public.candidatos VALUES (26, '00100026', 'Walter Chirinos', 'PRIN', 'presidente', 45, 'Política', 26, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:40.817008');
INSERT INTO public.candidatos VALUES (27, '00100027', 'Álvaro Paz de la Barra', 'Fe en el Perú', 'presidente', 57, 'Abogado', 27, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:41.862041');
INSERT INTO public.candidatos VALUES (28, '00100028', 'Walter Chirinos', 'PRIN', 'presidente', 45, 'Política', 28, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:42.922647');
INSERT INTO public.candidatos VALUES (29, '00100029', 'Ronald Atencio', 'Venceremos', 'presidente', 50, 'Abogado', 29, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:43.97126');
INSERT INTO public.candidatos VALUES (30, '00100030', 'Joaquín Massé', 'Democrático Federal', 'presidente', 55, 'Empresario', 30, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:45.022658');
INSERT INTO public.candidatos VALUES (31, '00100031', 'Francisco Diez-Canseco', 'Perú Acción', 'presidente', 79, 'Abogado', 31, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:46.081705');
INSERT INTO public.candidatos VALUES (32, '00100032', 'Wolfgang Grozo', 'Integridad Democrática', 'presidente', 58, 'Abogado', 32, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:47.134477');
INSERT INTO public.candidatos VALUES (33, '00100033', 'Carlos Álvarez', 'País para Todos', 'presidente', 55, 'Comunicador', 33, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:48.196182');
INSERT INTO public.candidatos VALUES (34, '00100034', 'George Forsyth', 'Somos Perú', 'presidente', 43, 'Empresario', 34, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:49.253951');
INSERT INTO public.candidatos VALUES (1, '00100001', 'Keiko Fujimori Higuchi', 'Fuerza Popular', 'presidente', 51, 'Política', 1, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:14.600241');
INSERT INTO public.candidatos VALUES (35, '00100035', 'Alfonso López Chau', 'Ahora Nación', 'presidente', 59, 'Ingeniero', 35, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:50.300466');
INSERT INTO public.candidatos VALUES (36, '00100036', 'Marisol Pérez Tello', 'Primero la Gente', 'presidente', 55, 'Política', 36, true, 'JNE', 'https://declara.jne.gob.pe', 'https://votoinformado.jne.gob.pe', 'verde', 'verde', 'Información en verificación', '[]', 0, '2026-04-07 05:25:51.350027');


--
-- Data for Name: declaraciones_juradas; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.declaraciones_juradas VALUES (1, '40703162', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-06 13:12:45.361611');
INSERT INTO public.declaraciones_juradas VALUES (2, '40703162', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-06 13:15:20.617776');
INSERT INTO public.declaraciones_juradas VALUES (3, '40703162', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-06 13:23:22.695906');
INSERT INTO public.declaraciones_juradas VALUES (4, '00000000', '2023-01-01', 1000.00, NULL, NULL, NULL, NULL, NULL, 500.00, NULL, '2026-04-06 16:54:51.724971');
INSERT INTO public.declaraciones_juradas VALUES (5, '40703162', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-06 21:53:12.702842');
INSERT INTO public.declaraciones_juradas VALUES (6, '40703162', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-06 22:14:13.831766');
INSERT INTO public.declaraciones_juradas VALUES (7, '00100001', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:14.566557');
INSERT INTO public.declaraciones_juradas VALUES (8, '00100002', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:15.628895');
INSERT INTO public.declaraciones_juradas VALUES (9, '00100003', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:16.680026');
INSERT INTO public.declaraciones_juradas VALUES (10, '00100004', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:17.726941');
INSERT INTO public.declaraciones_juradas VALUES (11, '00100005', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:18.762023');
INSERT INTO public.declaraciones_juradas VALUES (12, '00100006', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:19.79653');
INSERT INTO public.declaraciones_juradas VALUES (13, '00100007', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:20.846143');
INSERT INTO public.declaraciones_juradas VALUES (14, '00100008', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:21.896215');
INSERT INTO public.declaraciones_juradas VALUES (15, '00100009', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:22.945291');
INSERT INTO public.declaraciones_juradas VALUES (16, '00100010', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:23.992211');
INSERT INTO public.declaraciones_juradas VALUES (17, '00100011', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:25.043336');
INSERT INTO public.declaraciones_juradas VALUES (18, '00100012', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:26.095341');
INSERT INTO public.declaraciones_juradas VALUES (19, '00100013', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:27.146166');
INSERT INTO public.declaraciones_juradas VALUES (20, '00100014', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:28.196179');
INSERT INTO public.declaraciones_juradas VALUES (21, '00100015', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:29.246246');
INSERT INTO public.declaraciones_juradas VALUES (22, '00100016', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:30.296159');
INSERT INTO public.declaraciones_juradas VALUES (23, '00100017', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:31.342139');
INSERT INTO public.declaraciones_juradas VALUES (24, '00100018', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:32.393408');
INSERT INTO public.declaraciones_juradas VALUES (25, '00100019', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:33.442305');
INSERT INTO public.declaraciones_juradas VALUES (26, '00100020', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:34.493974');
INSERT INTO public.declaraciones_juradas VALUES (27, '00100021', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:35.542145');
INSERT INTO public.declaraciones_juradas VALUES (28, '00100022', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:36.595187');
INSERT INTO public.declaraciones_juradas VALUES (29, '00100023', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:37.642523');
INSERT INTO public.declaraciones_juradas VALUES (30, '00100024', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:38.693219');
INSERT INTO public.declaraciones_juradas VALUES (31, '00100025', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:39.742052');
INSERT INTO public.declaraciones_juradas VALUES (32, '00100026', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:40.792356');
INSERT INTO public.declaraciones_juradas VALUES (33, '00100027', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:41.841906');
INSERT INTO public.declaraciones_juradas VALUES (34, '00100028', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:42.892303');
INSERT INTO public.declaraciones_juradas VALUES (35, '00100029', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:43.9431');
INSERT INTO public.declaraciones_juradas VALUES (36, '00100030', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:44.997668');
INSERT INTO public.declaraciones_juradas VALUES (37, '00100031', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:46.057041');
INSERT INTO public.declaraciones_juradas VALUES (38, '00100032', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:47.109298');
INSERT INTO public.declaraciones_juradas VALUES (39, '00100033', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:48.156933');
INSERT INTO public.declaraciones_juradas VALUES (40, '00100034', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:49.226954');
INSERT INTO public.declaraciones_juradas VALUES (41, '00100035', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:50.275755');
INSERT INTO public.declaraciones_juradas VALUES (42, '00100036', '2023-01-01', 500000.00, NULL, NULL, NULL, NULL, NULL, 120000.00, NULL, '2026-04-07 05:25:51.324905');


--
-- Data for Name: donaciones; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: experiencia_laboral; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.experiencia_laboral VALUES (1, '40703162', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-06 13:12:45.351531');
INSERT INTO public.experiencia_laboral VALUES (2, '40703162', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-06 13:15:20.609151');
INSERT INTO public.experiencia_laboral VALUES (3, '40703162', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-06 13:23:22.689409');
INSERT INTO public.experiencia_laboral VALUES (4, '40703162', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-06 21:53:12.693073');
INSERT INTO public.experiencia_laboral VALUES (5, '40703162', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-06 22:14:13.820235');
INSERT INTO public.experiencia_laboral VALUES (6, '00100001', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:14.555291');
INSERT INTO public.experiencia_laboral VALUES (7, '00100002', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:15.621789');
INSERT INTO public.experiencia_laboral VALUES (8, '00100003', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:16.671377');
INSERT INTO public.experiencia_laboral VALUES (9, '00100004', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:17.720027');
INSERT INTO public.experiencia_laboral VALUES (10, '00100005', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:18.755067');
INSERT INTO public.experiencia_laboral VALUES (11, '00100006', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:19.788784');
INSERT INTO public.experiencia_laboral VALUES (12, '00100007', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:20.836022');
INSERT INTO public.experiencia_laboral VALUES (13, '00100008', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:21.885406');
INSERT INTO public.experiencia_laboral VALUES (14, '00100009', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:22.935766');
INSERT INTO public.experiencia_laboral VALUES (15, '00100010', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:23.985771');
INSERT INTO public.experiencia_laboral VALUES (16, '00100011', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:25.03551');
INSERT INTO public.experiencia_laboral VALUES (17, '00100012', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:26.085702');
INSERT INTO public.experiencia_laboral VALUES (18, '00100013', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:27.135326');
INSERT INTO public.experiencia_laboral VALUES (19, '00100014', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:28.186406');
INSERT INTO public.experiencia_laboral VALUES (20, '00100015', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:29.235225');
INSERT INTO public.experiencia_laboral VALUES (21, '00100016', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:30.285067');
INSERT INTO public.experiencia_laboral VALUES (22, '00100017', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:31.335007');
INSERT INTO public.experiencia_laboral VALUES (23, '00100018', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:32.384618');
INSERT INTO public.experiencia_laboral VALUES (24, '00100019', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:33.430257');
INSERT INTO public.experiencia_laboral VALUES (25, '00100020', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:34.484856');
INSERT INTO public.experiencia_laboral VALUES (26, '00100021', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:35.531984');
INSERT INTO public.experiencia_laboral VALUES (27, '00100022', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:36.58553');
INSERT INTO public.experiencia_laboral VALUES (28, '00100023', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:37.634399');
INSERT INTO public.experiencia_laboral VALUES (29, '00100024', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:38.684122');
INSERT INTO public.experiencia_laboral VALUES (30, '00100025', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:39.734283');
INSERT INTO public.experiencia_laboral VALUES (31, '00100026', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:40.784836');
INSERT INTO public.experiencia_laboral VALUES (32, '00100027', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:41.833829');
INSERT INTO public.experiencia_laboral VALUES (33, '00100028', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:42.884389');
INSERT INTO public.experiencia_laboral VALUES (34, '00100029', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:43.932716');
INSERT INTO public.experiencia_laboral VALUES (35, '00100030', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:44.988016');
INSERT INTO public.experiencia_laboral VALUES (36, '00100031', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:46.047251');
INSERT INTO public.experiencia_laboral VALUES (37, '00100032', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:47.10243');
INSERT INTO public.experiencia_laboral VALUES (38, '00100033', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:48.142777');
INSERT INTO public.experiencia_laboral VALUES (39, '00100034', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:49.216581');
INSERT INTO public.experiencia_laboral VALUES (40, '00100035', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:50.268398');
INSERT INTO public.experiencia_laboral VALUES (41, '00100036', 'sector_prueba', 'MEF', 'Ministro', NULL, NULL, NULL, 'JNE Declara+', '2026-04-07 05:25:51.31623');


--
-- Data for Name: formacion_academica; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.formacion_academica VALUES (1, '40703162', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-06 13:12:45.348474');
INSERT INTO public.formacion_academica VALUES (2, '40703162', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-06 13:15:20.606598');
INSERT INTO public.formacion_academica VALUES (3, '40703162', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-06 13:23:22.686422');
INSERT INTO public.formacion_academica VALUES (4, '40703162', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-06 21:53:12.688731');
INSERT INTO public.formacion_academica VALUES (5, '40703162', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-06 22:14:13.812066');
INSERT INTO public.formacion_academica VALUES (6, '00100001', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:14.549337');
INSERT INTO public.formacion_academica VALUES (7, '00100002', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:15.618731');
INSERT INTO public.formacion_academica VALUES (8, '00100003', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:16.669661');
INSERT INTO public.formacion_academica VALUES (9, '00100004', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:17.717557');
INSERT INTO public.formacion_academica VALUES (10, '00100005', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:18.752717');
INSERT INTO public.formacion_academica VALUES (11, '00100006', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:19.78704');
INSERT INTO public.formacion_academica VALUES (12, '00100007', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:20.833211');
INSERT INTO public.formacion_academica VALUES (13, '00100008', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:21.884667');
INSERT INTO public.formacion_academica VALUES (14, '00100009', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:22.934752');
INSERT INTO public.formacion_academica VALUES (15, '00100010', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:23.984621');
INSERT INTO public.formacion_academica VALUES (16, '00100011', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:25.033204');
INSERT INTO public.formacion_academica VALUES (17, '00100012', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:26.085038');
INSERT INTO public.formacion_academica VALUES (18, '00100013', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:27.134633');
INSERT INTO public.formacion_academica VALUES (19, '00100014', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:28.184206');
INSERT INTO public.formacion_academica VALUES (20, '00100015', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:29.234215');
INSERT INTO public.formacion_academica VALUES (21, '00100016', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:30.283467');
INSERT INTO public.formacion_academica VALUES (22, '00100017', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:31.332933');
INSERT INTO public.formacion_academica VALUES (23, '00100018', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:32.383021');
INSERT INTO public.formacion_academica VALUES (24, '00100019', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:33.428106');
INSERT INTO public.formacion_academica VALUES (25, '00100020', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:34.483644');
INSERT INTO public.formacion_academica VALUES (26, '00100021', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:35.529246');
INSERT INTO public.formacion_academica VALUES (27, '00100022', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:36.582299');
INSERT INTO public.formacion_academica VALUES (28, '00100023', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:37.632173');
INSERT INTO public.formacion_academica VALUES (29, '00100024', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:38.682552');
INSERT INTO public.formacion_academica VALUES (30, '00100025', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:39.731769');
INSERT INTO public.formacion_academica VALUES (31, '00100026', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:40.781841');
INSERT INTO public.formacion_academica VALUES (32, '00100027', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:41.832823');
INSERT INTO public.formacion_academica VALUES (33, '00100028', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:42.881703');
INSERT INTO public.formacion_academica VALUES (34, '00100029', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:43.930021');
INSERT INTO public.formacion_academica VALUES (35, '00100030', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:44.984375');
INSERT INTO public.formacion_academica VALUES (36, '00100031', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:46.045097');
INSERT INTO public.formacion_academica VALUES (37, '00100032', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:47.098934');
INSERT INTO public.formacion_academica VALUES (38, '00100033', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:48.139197');
INSERT INTO public.formacion_academica VALUES (39, '00100034', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:49.215472');
INSERT INTO public.formacion_academica VALUES (40, '00100035', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:50.265141');
INSERT INTO public.formacion_academica VALUES (41, '00100036', NULL, 'PUCP', 'Abogado', NULL, NULL, 2010, NULL, 'JNE Declara+', '2026-04-07 05:25:51.314499');


--
-- Data for Name: gestion_publica; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: historial_cambios; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: logs_busqueda; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: logs_extraccion; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.logs_extraccion VALUES (13, '40703162', 'hoja_vida', 'exito', NULL, '2026-04-06 21:53:12.698247');
INSERT INTO public.logs_extraccion VALUES (14, '40703162', 'declaraciones', 'exito', NULL, '2026-04-06 21:53:12.708545');
INSERT INTO public.logs_extraccion VALUES (15, '40703162', 'antecedentes', 'exito', NULL, '2026-04-06 21:53:12.718232');
INSERT INTO public.logs_extraccion VALUES (16, '40703162', 'aportes', 'exito', NULL, '2026-04-06 21:53:12.727095');
INSERT INTO public.logs_extraccion VALUES (17, '40703162', 'hoja_vida', 'exito', NULL, '2026-04-06 22:14:13.825653');
INSERT INTO public.logs_extraccion VALUES (18, '40703162', 'declaraciones', 'exito', NULL, '2026-04-06 22:14:13.836012');
INSERT INTO public.logs_extraccion VALUES (19, '40703162', 'antecedentes', 'exito', NULL, '2026-04-06 22:14:13.851675');
INSERT INTO public.logs_extraccion VALUES (20, '40703162', 'aportes', 'exito', NULL, '2026-04-06 22:14:13.861998');
INSERT INTO public.logs_extraccion VALUES (21, '00100001', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:14.560362');
INSERT INTO public.logs_extraccion VALUES (22, '00100001', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:14.575205');
INSERT INTO public.logs_extraccion VALUES (23, '00100001', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:14.585517');
INSERT INTO public.logs_extraccion VALUES (24, '00100001', 'aportes', 'exito', NULL, '2026-04-07 05:25:14.596618');
INSERT INTO public.logs_extraccion VALUES (25, '00100002', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:15.623372');
INSERT INTO public.logs_extraccion VALUES (26, '00100002', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:15.631971');
INSERT INTO public.logs_extraccion VALUES (27, '00100002', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:15.642307');
INSERT INTO public.logs_extraccion VALUES (28, '00100002', 'aportes', 'exito', NULL, '2026-04-07 05:25:15.65026');
INSERT INTO public.logs_extraccion VALUES (29, '00100003', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:16.675921');
INSERT INTO public.logs_extraccion VALUES (30, '00100003', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:16.682803');
INSERT INTO public.logs_extraccion VALUES (31, '00100003', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:16.69057');
INSERT INTO public.logs_extraccion VALUES (32, '00100003', 'aportes', 'exito', NULL, '2026-04-07 05:25:16.697616');
INSERT INTO public.logs_extraccion VALUES (33, '00100004', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:17.724232');
INSERT INTO public.logs_extraccion VALUES (34, '00100004', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:17.730138');
INSERT INTO public.logs_extraccion VALUES (35, '00100004', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:17.736962');
INSERT INTO public.logs_extraccion VALUES (36, '00100004', 'aportes', 'exito', NULL, '2026-04-07 05:25:17.743171');
INSERT INTO public.logs_extraccion VALUES (37, '00100005', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:18.757204');
INSERT INTO public.logs_extraccion VALUES (38, '00100005', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:18.765499');
INSERT INTO public.logs_extraccion VALUES (39, '00100005', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:18.772893');
INSERT INTO public.logs_extraccion VALUES (40, '00100005', 'aportes', 'exito', NULL, '2026-04-07 05:25:18.776983');
INSERT INTO public.logs_extraccion VALUES (41, '00100006', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:19.793032');
INSERT INTO public.logs_extraccion VALUES (42, '00100006', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:19.798554');
INSERT INTO public.logs_extraccion VALUES (43, '00100006', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:19.80727');
INSERT INTO public.logs_extraccion VALUES (44, '00100006', 'aportes', 'exito', NULL, '2026-04-07 05:25:19.814255');
INSERT INTO public.logs_extraccion VALUES (45, '00100007', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:20.841877');
INSERT INTO public.logs_extraccion VALUES (46, '00100007', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:20.848843');
INSERT INTO public.logs_extraccion VALUES (47, '00100007', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:20.85733');
INSERT INTO public.logs_extraccion VALUES (48, '00100007', 'aportes', 'exito', NULL, '2026-04-07 05:25:20.861989');
INSERT INTO public.logs_extraccion VALUES (49, '00100008', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:21.892636');
INSERT INTO public.logs_extraccion VALUES (50, '00100008', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:21.90044');
INSERT INTO public.logs_extraccion VALUES (51, '00100008', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:21.908675');
INSERT INTO public.logs_extraccion VALUES (52, '00100008', 'aportes', 'exito', NULL, '2026-04-07 05:25:21.912267');
INSERT INTO public.logs_extraccion VALUES (53, '00100009', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:22.942268');
INSERT INTO public.logs_extraccion VALUES (54, '00100009', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:22.94892');
INSERT INTO public.logs_extraccion VALUES (55, '00100009', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:22.956393');
INSERT INTO public.logs_extraccion VALUES (56, '00100009', 'aportes', 'exito', NULL, '2026-04-07 05:25:22.962232');
INSERT INTO public.logs_extraccion VALUES (57, '00100010', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:23.990561');
INSERT INTO public.logs_extraccion VALUES (58, '00100010', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:23.997325');
INSERT INTO public.logs_extraccion VALUES (59, '00100010', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:24.006314');
INSERT INTO public.logs_extraccion VALUES (60, '00100010', 'aportes', 'exito', NULL, '2026-04-07 05:25:24.012376');
INSERT INTO public.logs_extraccion VALUES (61, '00100011', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:25.04056');
INSERT INTO public.logs_extraccion VALUES (62, '00100011', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:25.046109');
INSERT INTO public.logs_extraccion VALUES (63, '00100011', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:25.05645');
INSERT INTO public.logs_extraccion VALUES (64, '00100011', 'aportes', 'exito', NULL, '2026-04-07 05:25:25.062197');
INSERT INTO public.logs_extraccion VALUES (65, '00100012', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:26.090592');
INSERT INTO public.logs_extraccion VALUES (66, '00100012', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:26.096372');
INSERT INTO public.logs_extraccion VALUES (67, '00100012', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:26.106786');
INSERT INTO public.logs_extraccion VALUES (68, '00100012', 'aportes', 'exito', NULL, '2026-04-07 05:25:26.112098');
INSERT INTO public.logs_extraccion VALUES (69, '00100013', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:27.141919');
INSERT INTO public.logs_extraccion VALUES (70, '00100013', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:27.148743');
INSERT INTO public.logs_extraccion VALUES (71, '00100013', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:27.157656');
INSERT INTO public.logs_extraccion VALUES (72, '00100013', 'aportes', 'exito', NULL, '2026-04-07 05:25:27.162296');
INSERT INTO public.logs_extraccion VALUES (73, '00100014', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:28.192099');
INSERT INTO public.logs_extraccion VALUES (74, '00100014', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:28.202063');
INSERT INTO public.logs_extraccion VALUES (75, '00100014', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:28.209432');
INSERT INTO public.logs_extraccion VALUES (76, '00100014', 'aportes', 'exito', NULL, '2026-04-07 05:25:28.218588');
INSERT INTO public.logs_extraccion VALUES (77, '00100015', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:29.242144');
INSERT INTO public.logs_extraccion VALUES (78, '00100015', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:29.250505');
INSERT INTO public.logs_extraccion VALUES (79, '00100015', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:29.258654');
INSERT INTO public.logs_extraccion VALUES (80, '00100015', 'aportes', 'exito', NULL, '2026-04-07 05:25:29.262283');
INSERT INTO public.logs_extraccion VALUES (81, '00100016', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:30.29209');
INSERT INTO public.logs_extraccion VALUES (82, '00100016', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:30.300339');
INSERT INTO public.logs_extraccion VALUES (83, '00100016', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:30.308948');
INSERT INTO public.logs_extraccion VALUES (84, '00100016', 'aportes', 'exito', NULL, '2026-04-07 05:25:30.312022');
INSERT INTO public.logs_extraccion VALUES (85, '00100017', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:31.338763');
INSERT INTO public.logs_extraccion VALUES (86, '00100017', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:31.343171');
INSERT INTO public.logs_extraccion VALUES (87, '00100017', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:31.353055');
INSERT INTO public.logs_extraccion VALUES (88, '00100017', 'aportes', 'exito', NULL, '2026-04-07 05:25:31.361001');
INSERT INTO public.logs_extraccion VALUES (89, '00100018', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:32.38893');
INSERT INTO public.logs_extraccion VALUES (90, '00100018', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:32.395973');
INSERT INTO public.logs_extraccion VALUES (91, '00100018', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:32.406098');
INSERT INTO public.logs_extraccion VALUES (92, '00100018', 'aportes', 'exito', NULL, '2026-04-07 05:25:32.413816');
INSERT INTO public.logs_extraccion VALUES (93, '00100019', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:33.436751');
INSERT INTO public.logs_extraccion VALUES (94, '00100019', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:33.446087');
INSERT INTO public.logs_extraccion VALUES (95, '00100019', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:33.456164');
INSERT INTO public.logs_extraccion VALUES (96, '00100019', 'aportes', 'exito', NULL, '2026-04-07 05:25:33.465887');
INSERT INTO public.logs_extraccion VALUES (97, '00100020', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:34.491229');
INSERT INTO public.logs_extraccion VALUES (98, '00100020', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:34.498694');
INSERT INTO public.logs_extraccion VALUES (99, '00100020', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:34.506718');
INSERT INTO public.logs_extraccion VALUES (100, '00100020', 'aportes', 'exito', NULL, '2026-04-07 05:25:34.511967');
INSERT INTO public.logs_extraccion VALUES (101, '00100021', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:35.538125');
INSERT INTO public.logs_extraccion VALUES (102, '00100021', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:35.546091');
INSERT INTO public.logs_extraccion VALUES (103, '00100021', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:35.556297');
INSERT INTO public.logs_extraccion VALUES (104, '00100021', 'aportes', 'exito', NULL, '2026-04-07 05:25:35.562088');
INSERT INTO public.logs_extraccion VALUES (105, '00100022', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:36.590542');
INSERT INTO public.logs_extraccion VALUES (106, '00100022', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:36.600233');
INSERT INTO public.logs_extraccion VALUES (107, '00100022', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:36.609461');
INSERT INTO public.logs_extraccion VALUES (108, '00100022', 'aportes', 'exito', NULL, '2026-04-07 05:25:36.619934');
INSERT INTO public.logs_extraccion VALUES (109, '00100023', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:37.639195');
INSERT INTO public.logs_extraccion VALUES (110, '00100023', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:37.646068');
INSERT INTO public.logs_extraccion VALUES (111, '00100023', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:37.655387');
INSERT INTO public.logs_extraccion VALUES (112, '00100023', 'aportes', 'exito', NULL, '2026-04-07 05:25:37.662188');
INSERT INTO public.logs_extraccion VALUES (113, '00100024', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:38.690544');
INSERT INTO public.logs_extraccion VALUES (114, '00100024', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:38.698964');
INSERT INTO public.logs_extraccion VALUES (115, '00100024', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:38.708512');
INSERT INTO public.logs_extraccion VALUES (116, '00100024', 'aportes', 'exito', NULL, '2026-04-07 05:25:38.716473');
INSERT INTO public.logs_extraccion VALUES (117, '00100025', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:39.740385');
INSERT INTO public.logs_extraccion VALUES (118, '00100025', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:39.749378');
INSERT INTO public.logs_extraccion VALUES (119, '00100025', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:39.759408');
INSERT INTO public.logs_extraccion VALUES (120, '00100025', 'aportes', 'exito', NULL, '2026-04-07 05:25:39.767378');
INSERT INTO public.logs_extraccion VALUES (121, '00100026', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:40.789038');
INSERT INTO public.logs_extraccion VALUES (122, '00100026', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:40.796432');
INSERT INTO public.logs_extraccion VALUES (123, '00100026', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:40.80447');
INSERT INTO public.logs_extraccion VALUES (124, '00100026', 'aportes', 'exito', NULL, '2026-04-07 05:25:40.812302');
INSERT INTO public.logs_extraccion VALUES (125, '00100027', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:41.840168');
INSERT INTO public.logs_extraccion VALUES (126, '00100027', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:41.846004');
INSERT INTO public.logs_extraccion VALUES (127, '00100027', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:41.8542');
INSERT INTO public.logs_extraccion VALUES (128, '00100027', 'aportes', 'exito', NULL, '2026-04-07 05:25:41.859379');
INSERT INTO public.logs_extraccion VALUES (129, '00100028', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:42.890727');
INSERT INTO public.logs_extraccion VALUES (130, '00100028', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:42.899407');
INSERT INTO public.logs_extraccion VALUES (131, '00100028', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:42.907153');
INSERT INTO public.logs_extraccion VALUES (132, '00100028', 'aportes', 'exito', NULL, '2026-04-07 05:25:42.917037');
INSERT INTO public.logs_extraccion VALUES (133, '00100029', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:43.93722');
INSERT INTO public.logs_extraccion VALUES (134, '00100029', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:43.947172');
INSERT INTO public.logs_extraccion VALUES (135, '00100029', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:43.956432');
INSERT INTO public.logs_extraccion VALUES (136, '00100029', 'aportes', 'exito', NULL, '2026-04-07 05:25:43.966626');
INSERT INTO public.logs_extraccion VALUES (137, '00100030', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:44.993465');
INSERT INTO public.logs_extraccion VALUES (138, '00100030', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:45.00299');
INSERT INTO public.logs_extraccion VALUES (139, '00100030', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:45.011928');
INSERT INTO public.logs_extraccion VALUES (140, '00100030', 'aportes', 'exito', NULL, '2026-04-07 05:25:45.022658');
INSERT INTO public.logs_extraccion VALUES (141, '00100031', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:46.051586');
INSERT INTO public.logs_extraccion VALUES (142, '00100031', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:46.060591');
INSERT INTO public.logs_extraccion VALUES (143, '00100031', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:46.068375');
INSERT INTO public.logs_extraccion VALUES (144, '00100031', 'aportes', 'exito', NULL, '2026-04-07 05:25:46.078103');
INSERT INTO public.logs_extraccion VALUES (145, '00100032', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:47.106132');
INSERT INTO public.logs_extraccion VALUES (146, '00100032', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:47.111932');
INSERT INTO public.logs_extraccion VALUES (147, '00100032', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:47.122691');
INSERT INTO public.logs_extraccion VALUES (148, '00100032', 'aportes', 'exito', NULL, '2026-04-07 05:25:47.127119');
INSERT INTO public.logs_extraccion VALUES (149, '00100033', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:48.149494');
INSERT INTO public.logs_extraccion VALUES (150, '00100033', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:48.163726');
INSERT INTO public.logs_extraccion VALUES (151, '00100033', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:48.177246');
INSERT INTO public.logs_extraccion VALUES (152, '00100033', 'aportes', 'exito', NULL, '2026-04-07 05:25:48.189942');
INSERT INTO public.logs_extraccion VALUES (153, '00100034', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:49.222931');
INSERT INTO public.logs_extraccion VALUES (154, '00100034', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:49.232133');
INSERT INTO public.logs_extraccion VALUES (155, '00100034', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:49.241146');
INSERT INTO public.logs_extraccion VALUES (156, '00100034', 'aportes', 'exito', NULL, '2026-04-07 05:25:49.249304');
INSERT INTO public.logs_extraccion VALUES (157, '00100035', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:50.269947');
INSERT INTO public.logs_extraccion VALUES (158, '00100035', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:50.277293');
INSERT INTO public.logs_extraccion VALUES (159, '00100035', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:50.287128');
INSERT INTO public.logs_extraccion VALUES (160, '00100035', 'aportes', 'exito', NULL, '2026-04-07 05:25:50.296261');
INSERT INTO public.logs_extraccion VALUES (161, '00100036', 'hoja_vida', 'exito', NULL, '2026-04-07 05:25:51.320261');
INSERT INTO public.logs_extraccion VALUES (162, '00100036', 'declaraciones', 'exito', NULL, '2026-04-07 05:25:51.330113');
INSERT INTO public.logs_extraccion VALUES (163, '00100036', 'antecedentes', 'exito', NULL, '2026-04-07 05:25:51.34');
INSERT INTO public.logs_extraccion VALUES (164, '00100036', 'aportes', 'exito', NULL, '2026-04-07 05:25:51.346168');


--
-- Data for Name: partidos; Type: TABLE DATA; Schema: public; Owner: admin
--

INSERT INTO public.partidos VALUES ('ab50ddd5-1595-4426-86a8-6b6f86f5784a', 'Partido Democrático', NULL, NULL, NULL, false, NULL, 100.00, 1, 0, 1, 0, 0, '2026-04-06 17:34:12.739991', '2026-04-06 17:34:12.739991');
INSERT INTO public.partidos VALUES ('b2adc40e-969a-4df2-a511-d650fbd3bf58', 'Partido Liberal', NULL, NULL, NULL, false, NULL, 85.00, 1, 0, 1, 0, 0, '2026-04-06 17:34:12.763367', '2026-04-06 17:34:12.763367');
INSERT INTO public.partidos VALUES ('711c9062-ff96-4749-bc33-9f587cbcb5fb', 'Partido Regional', NULL, NULL, NULL, false, NULL, 60.00, 1, 0, 0, 1, 0, '2026-04-06 17:34:12.765784', '2026-04-06 17:34:12.765784');
INSERT INTO public.partidos VALUES ('f59c47f6-40f6-458b-a8a7-e7246d701bd1', 'Partido Indígena', NULL, NULL, NULL, false, NULL, 67.00, 1, 0, 0, 1, 0, '2026-04-06 17:34:12.77009', '2026-04-06 17:34:12.77009');
INSERT INTO public.partidos VALUES ('710ab017-4701-46c9-a91f-cb63ef87dba4', 'Partido Nacionalista', NULL, NULL, NULL, false, NULL, 50.00, 1, 0, 0, 1, 0, '2026-04-06 17:34:12.773071', '2026-04-06 17:34:12.773071');
INSERT INTO public.partidos VALUES ('81bd0d9a-c3c5-457e-8d26-7b054924e302', 'Partido Conservador', NULL, NULL, NULL, false, NULL, 75.00, 1, 0, 0, 0, 1, '2026-04-06 17:34:12.776125', '2026-04-06 17:34:12.776125');
INSERT INTO public.partidos VALUES ('b92454e7-d49e-4732-923a-a836d284d50a', 'Partido Independiente', NULL, NULL, NULL, false, NULL, 75.00, 1, 0, 0, 0, 1, '2026-04-06 17:34:12.778968', '2026-04-06 17:34:12.778968');
INSERT INTO public.partidos VALUES ('f475c890-817c-434d-8f78-0f26155568f7', 'Partido Unión', NULL, NULL, NULL, false, NULL, 75.00, 1, 0, 0, 0, 1, '2026-04-06 17:34:12.781157', '2026-04-06 17:34:12.781157');
INSERT INTO public.partidos VALUES ('b56d5876-f426-4826-aebc-7ad22d8fc8e1', 'Partido Socialista', NULL, NULL, NULL, false, NULL, 75.00, 1, 0, 0, 0, 1, '2026-04-06 17:34:12.78379', '2026-04-06 17:34:12.78379');
INSERT INTO public.partidos VALUES ('3138416d-723b-4081-ad83-54a4d8f81ce8', 'Partido Ciudadano', NULL, NULL, NULL, false, NULL, 95.00, 1, 1, 0, 0, 0, '2026-04-06 17:34:12.786023', '2026-04-06 17:34:12.786023');


--
-- Data for Name: procesos_activos; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: sentencias; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Data for Name: usuarios; Type: TABLE DATA; Schema: public; Owner: admin
--



--
-- Name: antecedentes_judiciales_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.antecedentes_judiciales_id_seq', 41, true);


--
-- Name: aportes_campana_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.aportes_campana_id_seq', 41, true);


--
-- Name: candidatos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.candidatos_id_seq', 36, true);


--
-- Name: declaraciones_juradas_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.declaraciones_juradas_id_seq', 42, true);


--
-- Name: experiencia_laboral_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.experiencia_laboral_id_seq', 41, true);


--
-- Name: formacion_academica_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.formacion_academica_id_seq', 41, true);


--
-- Name: gestion_publica_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.gestion_publica_id_seq', 1, false);


--
-- Name: historial_cambios_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.historial_cambios_id_seq', 1, false);


--
-- Name: logs_extraccion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: admin
--

SELECT pg_catalog.setval('public.logs_extraccion_id_seq', 164, true);


--
-- Name: antecedentes_judiciales antecedentes_judiciales_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.antecedentes_judiciales
    ADD CONSTRAINT antecedentes_judiciales_pkey PRIMARY KEY (id);


--
-- Name: aportantes aportantes_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.aportantes
    ADD CONSTRAINT aportantes_pkey PRIMARY KEY (id);


--
-- Name: aportes_campana aportes_campana_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.aportes_campana
    ADD CONSTRAINT aportes_campana_pkey PRIMARY KEY (id);


--
-- Name: auditoria_candidatos auditoria_candidatos_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.auditoria_candidatos
    ADD CONSTRAINT auditoria_candidatos_pkey PRIMARY KEY (id);


--
-- Name: candidatos candidatos_dni_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.candidatos
    ADD CONSTRAINT candidatos_dni_key UNIQUE (dni);


--
-- Name: candidatos candidatos_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.candidatos
    ADD CONSTRAINT candidatos_pkey PRIMARY KEY (id);


--
-- Name: declaraciones_juradas declaraciones_juradas_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.declaraciones_juradas
    ADD CONSTRAINT declaraciones_juradas_pkey PRIMARY KEY (id);


--
-- Name: donaciones donaciones_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_pkey PRIMARY KEY (id);


--
-- Name: experiencia_laboral experiencia_laboral_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.experiencia_laboral
    ADD CONSTRAINT experiencia_laboral_pkey PRIMARY KEY (id);


--
-- Name: formacion_academica formacion_academica_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.formacion_academica
    ADD CONSTRAINT formacion_academica_pkey PRIMARY KEY (id);


--
-- Name: gestion_publica gestion_publica_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.gestion_publica
    ADD CONSTRAINT gestion_publica_pkey PRIMARY KEY (id);


--
-- Name: historial_cambios historial_cambios_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.historial_cambios
    ADD CONSTRAINT historial_cambios_pkey PRIMARY KEY (id);


--
-- Name: logs_busqueda logs_busqueda_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.logs_busqueda
    ADD CONSTRAINT logs_busqueda_pkey PRIMARY KEY (id);


--
-- Name: logs_extraccion logs_extraccion_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.logs_extraccion
    ADD CONSTRAINT logs_extraccion_pkey PRIMARY KEY (id);


--
-- Name: partidos partidos_nombre_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_nombre_key UNIQUE (nombre);


--
-- Name: partidos partidos_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.partidos
    ADD CONSTRAINT partidos_pkey PRIMARY KEY (id);


--
-- Name: procesos_activos procesos_activos_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.procesos_activos
    ADD CONSTRAINT procesos_activos_pkey PRIMARY KEY (id);


--
-- Name: sentencias sentencias_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.sentencias
    ADD CONSTRAINT sentencias_pkey PRIMARY KEY (id);


--
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);


--
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id);


--
-- Name: idx_aportantes_candidato; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_aportantes_candidato ON public.aportantes USING btree (candidato_dni);


--
-- Name: idx_aportantes_monto; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_aportantes_monto ON public.aportantes USING btree (monto);


--
-- Name: idx_aportantes_monto_alto; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_aportantes_monto_alto ON public.aportantes USING btree (monto) WHERE (monto > (10000)::numeric);


--
-- Name: idx_aportes_dni; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_aportes_dni ON public.aportes_campana USING btree (candidato_dni);


--
-- Name: idx_auditoria_candidato; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_auditoria_candidato ON public.auditoria_candidatos USING btree (candidato_dni);


--
-- Name: idx_auditoria_fecha; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_auditoria_fecha ON public.auditoria_candidatos USING btree (created_at);


--
-- Name: idx_formacion_dni; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_formacion_dni ON public.formacion_academica USING btree (candidato_dni);


--
-- Name: idx_judiciales_dni; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_judiciales_dni ON public.antecedentes_judiciales USING btree (candidato_dni);


--
-- Name: idx_logs_fecha; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_logs_fecha ON public.logs_busqueda USING btree (fecha);


--
-- Name: idx_logs_termino; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_logs_termino ON public.logs_busqueda USING btree (termino_busqueda);


--
-- Name: idx_procesos_candidato; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_procesos_candidato ON public.procesos_activos USING btree (candidato_dni);


--
-- Name: idx_procesos_etapa; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_procesos_etapa ON public.procesos_activos USING btree (etapa);


--
-- Name: idx_sentencias_candidato; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_sentencias_candidato ON public.sentencias USING btree (candidato_dni);


--
-- Name: idx_sentencias_expediente; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_sentencias_expediente ON public.sentencias USING btree (numero_expediente);


--
-- Name: idx_sentencias_fecha; Type: INDEX; Schema: public; Owner: admin
--

CREATE INDEX idx_sentencias_fecha ON public.sentencias USING btree (fecha_sentencia DESC);


--
-- Name: partidos trigger_actualizar_timestamp_partidos; Type: TRIGGER; Schema: public; Owner: admin
--

CREATE TRIGGER trigger_actualizar_timestamp_partidos BEFORE UPDATE ON public.partidos FOR EACH ROW EXECUTE FUNCTION public.actualizar_timestamp();


--
-- Name: donaciones donaciones_usuario_email_fkey; Type: FK CONSTRAINT; Schema: public; Owner: admin
--

ALTER TABLE ONLY public.donaciones
    ADD CONSTRAINT donaciones_usuario_email_fkey FOREIGN KEY (usuario_email) REFERENCES public.usuarios(email) ON DELETE SET NULL;


--
