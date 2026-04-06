-- database/schema_completo.sql
-- =====================================================
-- ESQUEMA COMPLETO PARA 10,000 CANDIDATOS
-- =====================================================

-- 1. TABLA PRINCIPAL DE CANDIDATOS
CREATE TABLE IF NOT EXISTS candidatos (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) UNIQUE NOT NULL,
    nombres_completos VARCHAR(200),
    apellido_paterno VARCHAR(100),
    apellido_materno VARCHAR(100),
    
    -- Datos electorales
    cargo_postula VARCHAR(50),
    partido VARCHAR(200),
    alianza VARCHAR(200),
    numero_lista VARCHAR(20),
    region_postula VARCHAR(100),
    
    -- Datos personales
    fecha_nacimiento DATE,
    edad INTEGER,
    lugar_nacimiento VARCHAR(200),
    genero VARCHAR(20),
    
    -- Contacto (si disponible)
    email VARCHAR(100),
    telefono VARCHAR(20),
    
    -- Niveles de criticidad (calculados)
    nivel_criticidad VARCHAR(10) DEFAULT 'verde',
    puntaje_transparencia INTEGER DEFAULT 0,
    inhabilitado BOOLEAN DEFAULT FALSE,
    
    -- Auditoría
    fecha_registro TIMESTAMP DEFAULT NOW(),
    ultima_actualizacion TIMESTAMP DEFAULT NOW(),
    fuente_datos TEXT
);

-- 2. TABLA DE HOJAS DE VIDA (JNE)
CREATE TABLE IF NOT EXISTS hojas_vida (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    url_hoja_vida TEXT,
    contenido_html TEXT,
    contenido_json JSONB,
    fecha_extraccion TIMESTAMP DEFAULT NOW(),
    estado VARCHAR(20) DEFAULT 'pendiente' -- pendiente, procesado, error
);

-- 3. TABLA DE FORMACIÓN ACADÉMICA
CREATE TABLE IF NOT EXISTS formacion_academica (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    tipo VARCHAR(50), -- universidad, posgrado, curso
    institucion VARCHAR(200),
    titulo VARCHAR(200),
    grado VARCHAR(50),
    anio_inicio INTEGER,
    anio_fin INTEGER,
    sunedu_registro VARCHAR(50),
    fuente VARCHAR(200),
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 4. TABLA DE EXPERIENCIA LABORAL
CREATE TABLE IF NOT EXISTS experiencia_laboral (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    sector VARCHAR(50), -- publico, privado
    institucion VARCHAR(200),
    cargo VARCHAR(200),
    fecha_inicio DATE,
    fecha_fin DATE,
    funciones TEXT,
    fuente VARCHAR(200),
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 5. TABLA DE DECLARACIONES JURADAS (CGR)
CREATE TABLE IF NOT EXISTS declaraciones_juradas (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
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

-- 6. TABLA DE APORTES DE CAMPAÑA (ONPE)
CREATE TABLE IF NOT EXISTS aportes_campana (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    aportante_nombre VARCHAR(200),
    aportante_tipo VARCHAR(30), -- persona_natural, persona_juridica
    aportante_ruc_dni VARCHAR(20),
    monto DECIMAL(12,2),
    fecha_aporte DATE,
    tipo_aporte VARCHAR(50),
    es_sospechoso BOOLEAN DEFAULT FALSE,
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 7. TABLA DE ANTECEDENTES JUDICIALES
CREATE TABLE IF NOT EXISTS antecedentes_judiciales (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    tipo VARCHAR(50), -- sentencia_firme, proceso_activo, investigacion_fiscal
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

-- 8. TABLA DE SANCIONES ADMINISTRATIVAS
CREATE TABLE IF NOT EXISTS sanciones_administrativas (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    tipo_sancion VARCHAR(100),
    entidad VARCHAR(200),
    fecha_sancion DATE,
    duracion INTEGER, -- en meses
    motivo TEXT,
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 9. TABLA DE VÍNCULOS EMPRESARIALES
CREATE TABLE IF NOT EXISTS vinculos_empresariales (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    empresa_nombre VARCHAR(200),
    empresa_ruc VARCHAR(20),
    participacion_porcentaje DECIMAL(5,2),
    cargo_empresa VARCHAR(100),
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 10. TABLA DE CONTRATOS CON EL ESTADO (SEACE)
CREATE TABLE IF NOT EXISTS contratos_estatales (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    entidad VARCHAR(200),
    numero_contrato VARCHAR(100),
    monto DECIMAL(15,2),
    fecha_contrato DATE,
    objeto TEXT,
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 11. TABLA DE GESTIÓN PÚBLICA (PORTAL TRANSPARENCIA)
CREATE TABLE IF NOT EXISTS gestion_publica (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    institucion VARCHAR(200),
    cargo VARCHAR(200),
    periodo VARCHAR(50),
    remuneracion_mensual DECIMAL(10,2),
    metas_cumplidas DECIMAL(5,2), -- porcentaje
    viajes_oficiales INTEGER,
    contratos_supervisados INTEGER,
    url_fuente TEXT,
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 12. TABLA DE PLAN DE GOBIERNO
CREATE TABLE IF NOT EXISTS plan_gobierno (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    url_documento TEXT,
    ejes_tematicos JSONB,
    propuestas_clave TEXT[],
    consistencia_score INTEGER, -- 0-100
    fecha_extraccion TIMESTAMP DEFAULT NOW()
);

-- 13. TABLA DE HISTORIAL DE CAMBIOS
CREATE TABLE IF NOT EXISTS historial_cambios (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8) REFERENCES candidatos(dni),
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fuente VARCHAR(200),
    fecha_cambio TIMESTAMP DEFAULT NOW()
);

-- 14. TABLA DE LOGS DE EXTRACCIÓN
CREATE TABLE IF NOT EXISTS logs_extraccion (
    id SERIAL PRIMARY KEY,
    candidato_dni VARCHAR(8),
    fuente VARCHAR(100),
    estado VARCHAR(20), -- exito, error, pendiente
    mensaje TEXT,
    fecha_intento TIMESTAMP DEFAULT NOW()
);

-- 15. TABLA DE CONTROL DE PROCESAMIENTO (PARA REANUDAR)
CREATE TABLE IF NOT EXISTS control_procesamiento (
    id SERIAL PRIMARY KEY,
    lote_numero INTEGER,
    candidatos_procesados INTEGER,
    total_candidatos INTEGER,
    ultimo_dni_procesado VARCHAR(8),
    estado VARCHAR(20), -- en_progreso, completado, pausado
    fecha_inicio TIMESTAMP,
    fecha_fin TIMESTAMP
);

-- ÍNDICES PARA BÚSQUEDAS RÁPIDAS
CREATE INDEX IF NOT EXISTS idx_candidatos_dni ON candidatos(dni);
CREATE INDEX IF NOT EXISTS idx_candidatos_partido ON candidatos(partido);
CREATE INDEX IF NOT EXISTS idx_candidatos_nivel ON candidatos(nivel_criticidad);
CREATE INDEX IF NOT EXISTS idx_aportes_candidato ON aportes_campana(candidato_dni);
CREATE INDEX IF NOT EXISTS idx_judiciales_candidato ON antecedentes_judiciales(candidato_dni);
CREATE INDEX IF NOT EXISTS idx_logs_candidato ON logs_extraccion(candidato_dni);
