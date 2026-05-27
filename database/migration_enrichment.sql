-- Migración: Enriquecimiento de Candidatos y Discovery
-- Añadir campos para fotos, sentencias e ingresos

ALTER TABLE candidatos 
ADD COLUMN IF NOT EXISTS foto_url TEXT,
ADD COLUMN IF NOT EXISTS url_hoja_vida TEXT,
ADD COLUMN IF NOT EXISTS ingresos_total DECIMAL(15, 2),
ADD COLUMN IF NOT EXISTS tiene_sentencias BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS tipo_sentencia TEXT;

-- Crear tabla para seguimiento del descubrimiento de candidatos
CREATE TABLE IF NOT EXISTS pendientes_validacion (
    id SERIAL PRIMARY KEY,
    dni VARCHAR(8) UNIQUE NOT NULL,
    url_maestra TEXT,
    url_hoja_vida TEXT NOT NULL,
    procesado BOOLEAN DEFAULT FALSE,
    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexar DNI en la nueva tabla para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_pendientes_dni ON pendientes_validacion(dni);
