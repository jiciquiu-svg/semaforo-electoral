-- =====================================================
-- TABLAS PARA CANDIDATOS
-- =====================================================

-- Extender tabla candidatos
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS dni VARCHAR(8) UNIQUE;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS nombres_completos VARCHAR(200);
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS partido VARCHAR(200);
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS cargo_postula VARCHAR(50);
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS nivel_criticidad VARCHAR(10) DEFAULT 'verde';
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS puntaje_transparencia INTEGER DEFAULT 0;
ALTER TABLE candidatos ADD COLUMN IF NOT EXISTS ultima_actualizacion TIMESTAMP DEFAULT NOW();

-- Formación Académica
CREATE TABLE IF NOT EXISTS formacion_academica (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
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

-- Experiencia Laboral
CREATE TABLE IF NOT EXISTS experiencia_laboral (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
    sector VARCHAR(50),
    institucion VARCHAR(200),
    cargo VARCHAR(200),
    fecha_inicio DATE,
    fecha_fin DATE,
    funciones TEXT,
    fuente VARCHAR(200),
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- Declaraciones Juradas
CREATE TABLE IF NOT EXISTS declaraciones_juradas (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
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

-- Aportes de Campaña
CREATE TABLE IF NOT EXISTS aportes_campana (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
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

-- Antecedentes Judiciales
CREATE TABLE IF NOT EXISTS antecedentes_judiciales (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
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

-- Historial de Cambios
CREATE TABLE IF NOT EXISTS historial_cambios (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fuente VARCHAR(200),
    fecha_cambio TIMESTAMP DEFAULT NOW()
);

-- Logs de Extracción
CREATE TABLE IF NOT EXISTS logs_extraccion (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
    fuente VARCHAR(100),
    estado VARCHAR(20),
    mensaje TEXT,
    fecha_intento TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_candidatos_dni ON candidatos(dni);
CREATE INDEX IF NOT EXISTS idx_formacion_dni ON formacion_academica(candidato_dni);
CREATE INDEX IF NOT EXISTS idx_aportes_dni ON aportes_campana(candidato_dni);
CREATE INDEX IF NOT EXISTS idx_judiciales_dni ON antecedentes_judiciales(candidato_dni);

DO $$
BEGIN
    RAISE NOTICE '✅ Tablas creadas exitosamente';
END $$;
