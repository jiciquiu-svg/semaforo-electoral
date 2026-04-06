-- =====================================================
-- BASE DE DATOS: CANDIDATO AL DESNUDO - PERÚ 2026
-- =====================================================
-- Descripción: Esquema completo para transparencia electoral
-- Autor: Proyecto Cívico Perú
-- Fecha: Marzo 2026
-- =====================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- =====================================================
-- 1. TABLA PRINCIPAL: CANDIDATOS
-- =====================================================

DROP TABLE IF EXISTS candidatos CASCADE;

CREATE TABLE candidatos (
    -- Identificación única
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dni VARCHAR(8) UNIQUE NOT NULL,
    nombres_completos VARCHAR(200) NOT NULL,
    
    -- Datos electorales
    cargo_postula VARCHAR(50) NOT NULL CHECK (cargo_postula IN ('presidente', 'vicepresidente', 'senador', 'diputado')),
    numero_lista VARCHAR(10),
    partido VARCHAR(200) NOT NULL,
    alianza VARCHAR(200),
    region_postula VARCHAR(100),
    numero_inscripcion_jne VARCHAR(50),
    
    -- Datos personales
    fecha_nacimiento DATE,
    edad INTEGER,
    lugar_nacimiento VARCHAR(200),
    domicilio TEXT,
    estado_civil VARCHAR(20) CHECK (estado_civil IN ('soltero', 'casado', 'divorciado', 'viudo', 'conviviente')),
    
    -- =================================================
    -- CAMPOS PARA CLASIFICACIÓN AUTOMÁTICA
    -- =================================================
    
    -- Datos judiciales
    tiene_sentencia_firme BOOLEAN DEFAULT FALSE,
    delito VARCHAR(200),
    numero_expediente VARCHAR(50),
    fecha_sentencia DATE,
    pena TEXT,
    estado_pena VARCHAR(20) CHECK (estado_pena IN ('profugo', 'domiciliaria', 'cumplida', 'prision', NULL)),
    proceso_activo BOOLEAN DEFAULT FALSE,
    etapa_proceso VARCHAR(20) CHECK (etapa_proceso IN ('juicio_oral', 'investigacion', 'apelacion', NULL)),
    fiscalia VARCHAR(200),
    juzgado VARCHAR(200),
    
    -- Datos económicos
    patrimonio_actual DECIMAL(15,2),
    patrimonio_anterior DECIMAL(15,2),
    variacion_patrimonial DECIMAL(10,2) DEFAULT 0.0,  -- porcentaje
    periodo_variacion VARCHAR(20),
    total_aportes DECIMAL(15,2) DEFAULT 0.0,
    numero_aportantes INTEGER DEFAULT 0,
    concentracion_top3 DECIMAL(5,2) DEFAULT 0.0,  -- porcentaje
    aportes_sospechosos INTEGER DEFAULT 0,
    tiene_contratos_familiares BOOLEAN DEFAULT FALSE,
    contratos_familiares_detalle JSONB,
    proveedores_recurrentes JSONB,
    
    -- Datos de historial público
    fue_congresista BOOLEAN DEFAULT FALSE,
    periodo_congresista VARCHAR(50),
    proyectos_presentados INTEGER DEFAULT 0,
    leyes_aprobadas INTEGER DEFAULT 0,
    asistencia_congreso DECIMAL(5,2),  -- porcentaje
    comisiones_integradas JSONB,
    fue_funcionario BOOLEAN DEFAULT FALSE,
    cargos_funcionario JSONB,
    fue_alcalde BOOLEAN DEFAULT FALSE,
    fue_gobernador BOOLEAN DEFAULT FALSE,
    candidaturas_anteriores JSONB,
    
    -- Datos de formación académica
    universidad VARCHAR(200),
    carrera VARCHAR(200),
    titulo VARCHAR(200),
    grado VARCHAR(30) CHECK (grado IN ('bachiller', 'licenciado', 'magister', 'doctor', NULL)),
    sunedu_registro VARCHAR(50),
    estudios_posgrado JSONB,
    certificaciones JSONB,
    
    -- =================================================
    -- CAMPOS CALCULADOS AUTOMÁTICAMENTE (NO INSERTAR MANUAL)
    -- =================================================
    
    nivel_criticidad VARCHAR(10) DEFAULT 'verde' 
        CHECK (nivel_criticidad IN ('verde', 'amarillo', 'naranja', 'rojo')),
    color VARCHAR(10) DEFAULT 'verde',
    subcategoria VARCHAR(50),
    mensaje_ciudadano TEXT,
    inhabilitado BOOLEAN DEFAULT FALSE,
    alertas_activas JSONB DEFAULT '[]'::jsonb,
    puntaje_transparencia INTEGER DEFAULT 0 CHECK (puntaje_transparencia BETWEEN 0 AND 100),
    
    -- Auditoría
    fuentes_consultadas JSONB DEFAULT '[]'::jsonb,
    ultima_actualizacion TIMESTAMP DEFAULT NOW(),
    hash_verificacion VARCHAR(64),
    datos_completos JSONB,  -- Backup del JSON original
    
    -- Índices para búsqueda rápida
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. TABLA DE PARTIDOS POLÍTICOS
-- =====================================================

DROP TABLE IF EXISTS partidos CASCADE;

CREATE TABLE partidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(200) UNIQUE NOT NULL,
    alianza VARCHAR(200),
    numero_inscripcion_jne VARCHAR(50),
    fecha_inscripcion DATE,
    tiene_sentencias BOOLEAN DEFAULT FALSE,
    sentencias JSONB,
    score_transparencia_promedio DECIMAL(5,2),
    total_candidatos INTEGER DEFAULT 0,
    candidatos_verde INTEGER DEFAULT 0,
    candidatos_amarillo INTEGER DEFAULT 0,
    candidatos_naranja INTEGER DEFAULT 0,
    candidatos_rojo INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. TABLA DE SENTENCIAS JUDICIALES
-- =====================================================

DROP TABLE IF EXISTS sentencias CASCADE;

CREATE TABLE sentencias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni) ON DELETE CASCADE,
    numero_expediente VARCHAR(50) NOT NULL,
    delito VARCHAR(200) NOT NULL,
    fecha_sentencia DATE NOT NULL,
    juzgado VARCHAR(200),
    pena TEXT,
    estado_pena VARCHAR(20) CHECK (estado_pena IN ('profugo', 'domiciliaria', 'cumplida', 'prision')),
    enlace_fuente TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sentencias_candidato ON sentencias(candidato_dni);
CREATE INDEX idx_sentencias_expediente ON sentencias(numero_expediente);

-- =====================================================
-- 4. TABLA DE PROCESOS ACTIVOS
-- =====================================================

DROP TABLE IF EXISTS procesos_activos CASCADE;

CREATE TABLE procesos_activos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni) ON DELETE CASCADE,
    numero_expediente VARCHAR(50) NOT NULL,
    delito_imputado VARCHAR(200) NOT NULL,
    etapa VARCHAR(20) CHECK (etapa IN ('investigacion_preparatoria', 'juicio_oral', 'apelacion', 'casacion')),
    fiscalia VARCHAR(200),
    juzgado VARCHAR(200),
    fecha_inicio DATE,
    estado VARCHAR(20) CHECK (estado IN ('activo', 'suspendido', 'archivado')),
    enlace_fuente TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_procesos_candidato ON procesos_activos(candidato_dni);

-- =====================================================
-- 5. TABLA DE APORTANTES DE CAMPAÑA
-- =====================================================

DROP TABLE IF EXISTS aportantes CASCADE;

CREATE TABLE aportantes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni) ON DELETE CASCADE,
    nombre_aportante VARCHAR(200) NOT NULL,
    tipo_aportante VARCHAR(20) CHECK (tipo_aportante IN ('persona_natural', 'persona_juridica')),
    ruc_dni VARCHAR(20),
    monto DECIMAL(15,2) NOT NULL,
    fecha_aporte DATE,
    es_sospechoso BOOLEAN DEFAULT FALSE,
    motivo_sospecha TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_aportantes_candidato ON aportantes(candidato_dni);
CREATE INDEX idx_aportantes_monto ON aportantes(monto);

-- =====================================================
-- 6. TABLA DE DECLARACIONES JURADAS (HISTÓRICO)
-- =====================================================

DROP TABLE IF EXISTS declaraciones_juradas CASCADE;

CREATE TABLE declaraciones_juradas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni) ON DELETE CASCADE,
    fecha_declaracion DATE NOT NULL,
    patrimonio_declarado DECIMAL(15,2),
    ingresos_anuales DECIMAL(15,2),
    bienes_inmuebles JSONB,
    bienes_muebles JSONB,
    cuentas_bancarias JSONB,
    deudas JSONB,
    vinculos_familiares JSONB,
    empresas_participacion JSONB,
    enlace_fuente TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_declaraciones_candidato ON declaraciones_juradas(candidato_dni);
CREATE INDEX idx_declaraciones_fecha ON declaraciones_juradas(fecha_declaracion);

-- =====================================================
-- 7. TABLA DE AUDITORÍA (REGISTRO DE CAMBIOS)
-- =====================================================

DROP TABLE IF EXISTS auditoria_candidatos CASCADE;

CREATE TABLE auditoria_candidatos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    candidato_dni VARCHAR(8),
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fuente_modificacion VARCHAR(200),
    usuario VARCHAR(100),
    ip_address INET,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auditoria_candidato ON auditoria_candidatos(candidato_dni);
CREATE INDEX idx_auditoria_fecha ON auditoria_candidatos(created_at);

-- =====================================================
-- 8. TABLA DE USUARIOS (PARA MONETIZACIÓN)
-- =====================================================

DROP TABLE IF EXISTS usuarios CASCADE;

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(200) UNIQUE NOT NULL,
    nombre VARCHAR(200),
    tipo_usuario VARCHAR(20) DEFAULT 'ciudadano' 
        CHECK (tipo_usuario IN ('ciudadano', 'periodista', 'investigador', 'admin')),
    donaciones_totales DECIMAL(10,2) DEFAULT 0.0,
    ultimo_acceso TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 9. TABLA DE DONACIONES
-- =====================================================

DROP TABLE IF EXISTS donaciones CASCADE;

CREATE TABLE donaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_email VARCHAR(200) REFERENCES usuarios(email) ON DELETE SET NULL,
    monto DECIMAL(10,2) NOT NULL,
    metodo_pago VARCHAR(20) CHECK (metodo_pago IN ('paypal', 'tarjeta', 'transferencia')),
    estado VARCHAR(20) DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'completado', 'fallido')),
    fecha TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 10. TABLA DE LOGS DE BÚSQUEDA (PARA ESTADÍSTICAS)
-- =====================================================

DROP TABLE IF EXISTS logs_busqueda CASCADE;

CREATE TABLE logs_busqueda (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    termino_busqueda VARCHAR(200),
    resultados_encontrados INTEGER,
    ip_address INET,
    user_agent TEXT,
    fecha TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_logs_fecha ON logs_busqueda(fecha);
CREATE INDEX idx_logs_termino ON logs_busqueda(termino_busqueda);