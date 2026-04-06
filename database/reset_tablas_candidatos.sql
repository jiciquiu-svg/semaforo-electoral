-- =====================================================
-- RESET Y CREACIÓN DE TABLAS DE CANDIDATOS
-- =====================================================

-- Limpiar tablas existentes para evitar conflictos de esquema
DROP TABLE IF EXISTS formacion_academica CASCADE;
DROP TABLE IF EXISTS experiencia_laboral CASCADE;
DROP TABLE IF EXISTS declaraciones_juradas CASCADE;
DROP TABLE IF EXISTS aportes_campana CASCADE;
DROP TABLE IF EXISTS antecedentes_judiciales CASCADE;
DROP TABLE IF EXISTS historial_cambios CASCADE;
DROP TABLE IF EXISTS logs_extraccion CASCADE;
DROP TABLE IF EXISTS gestion_publica CASCADE;

-- 1. Extender tabla candidatos existente (repetible)
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS dni VARCHAR(8) UNIQUE;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS nombres_completos VARCHAR(200);
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS partido VARCHAR(200);
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS cargo_postula VARCHAR(50);
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS nivel_criticidad VARCHAR(10) DEFAULT 'verde';
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS puntaje_transparencia INTEGER DEFAULT 0;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMP DEFAULT NOW();

-- 2. Formación Académica
CREATE TABLE formacion_academica (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    tipo VARCHAR(50),
    institucion VARCHAR(200),
    titulo VARCHAR(200),
    grado VARCHAR(50),
    anio_inicio INTEGER,
    anio_fin INTEGER,
    sunedu_registro VARCHAR(50),
    fuente VARCHAR(200),
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 3. Experiencia Laboral
CREATE TABLE experiencia_laboral (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    sector VARCHAR(50),
    institucion VARCHAR(200),
    cargo VARCHAR(200),
    fecha_inicio DATE,
    fecha_fin DATE,
    funciones TEXT,
    fuente VARCHAR(200),
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 4. Declaraciones Juradas
CREATE TABLE declaraciones_juradas (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    fecha_declaracion DATE,
    patrimonio_total DECIMAL(15,2),
    bienes_inmuebles JSONB,
    bienes_muebles JSONB,
    cuentas_bancarias JSONB,
    deudas JSONB,
    empresas_participacion JSONB,
    ingresos_anuales DECIMAL(15,2),
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 5. Aportes de Campaña
CREATE TABLE aportes_campana (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    aportante_nombre VARCHAR(200),
    aportante_tipo VARCHAR(30),
    aportante_ruc_dni VARCHAR(20),
    monto DECIMAL(12,2),
    fecha_aporte DATE,
    tipo_aporte VARCHAR(50),
    es_sospechoso BOOLEAN DEFAULT FALSE,
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 6. Antecedentes Judiciales
CREATE TABLE antecedentes_judiciales (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    tipo VARCHAR(50),
    delito VARCHAR(200),
    numero_expediente VARCHAR(50),
    juzgado VARCHAR(200),
    fiscalia VARCHAR(200),
    fecha_inicio DATE,
    fecha_sentencia DATE,
    estado VARCHAR(50),
    pena VARCHAR(200),
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 7. Historial de Cambios
CREATE TABLE historial_cambios (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fuente VARCHAR(200),
    fecha_cambio TIMESTAMP DEFAULT NOW()
);

-- 8. Logs de Extracción
CREATE TABLE logs_extraccion (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    fuente VARCHAR(100),
    estado VARCHAR(20),
    mensaje TEXT,
    fecha_intento TIMESTAMP DEFAULT NOW()
);

-- 9. Gestión Pública (Opcional, para completar el flujo)
CREATE TABLE gestion_publica (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(15),
    institucion VARCHAR(200),
    cargo VARCHAR(200),
    periodo VARCHAR(100),
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- Índices para búsquedas rápidas (usando 15 caracteres por si hay DNIs con letras o extranjeros)
CREATE INDEX idx_candidatos_dni ON candidatos(dni);
CREATE INDEX idx_formacion_dni ON formacion_academica(candidato_dni);
CREATE INDEX idx_aportes_dni ON aportes_campana(candidato_dni);
CREATE INDEX idx_judiciales_dni ON antecedentes_judiciales(candidato_dni);

DO $$
BEGIN
    RAISE NOTICE '✅ Tablas rectificadas exitosamente';
END $$;
