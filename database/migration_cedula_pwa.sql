-- =====================================================
-- MIGRACIÓN: Cédula Virtual PWA — Semáforo Electoral
-- Fecha: 2026-04-11
-- Objetivo: Agregar parlamento_andino y tipo_senador
-- =====================================================

-- 1. Eliminar la constraint antigua de cargo_postula
ALTER TABLE candidatos 
  DROP CONSTRAINT IF EXISTS candidatos_cargo_postula_check;

-- 2. Agregar la constraint actualizada con parlamento_andino
ALTER TABLE candidatos 
  ADD CONSTRAINT candidatos_cargo_postula_check 
  CHECK (cargo_postula IN (
    'presidente',
    'vicepresidente', 
    'senador',
    'diputado',
    'parlamento_andino'
  ));

-- 3. Agregar columna tipo_senador para distinguir NACIONAL vs REGIONAL
ALTER TABLE candidatos 
  ADD COLUMN IF NOT EXISTS tipo_senador VARCHAR(20) 
  CHECK (tipo_senador IN ('nacional', 'regional', NULL));

-- 4. Actualizar senadores existentes que tengan region_postula = NULL como nacionales
UPDATE candidatos 
  SET tipo_senador = 'nacional'
  WHERE cargo_postula = 'senador' 
    AND (region_postula IS NULL OR region_postula = '' OR region_postula ILIKE '%nacional%' OR region_postula ILIKE '%unico%');

-- 5. Actualizar senadores con región específica como regionales
UPDATE candidatos 
  SET tipo_senador = 'regional'
  WHERE cargo_postula = 'senador' 
    AND tipo_senador IS NULL
    AND region_postula IS NOT NULL 
    AND region_postula != '';

-- 6. Agregar columna logo_url al candidato para uso en la PWA
ALTER TABLE candidatos
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 7. Índice para búsquedas rápidas por cargo + partido (crítico para escala)
CREATE INDEX IF NOT EXISTS idx_candidatos_cargo_partido 
  ON candidatos(cargo_postula, partido);

CREATE INDEX IF NOT EXISTS idx_candidatos_cargo_region 
  ON candidatos(cargo_postula, region_postula);

CREATE INDEX IF NOT EXISTS idx_candidatos_tipo_senador 
  ON candidatos(tipo_senador) 
  WHERE cargo_postula = 'senador';

-- 8. Tabla partidos — agregar logo_url si no existe
ALTER TABLE partidos
  ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- 9. Endpoint helper: vista para la PWA
CREATE OR REPLACE VIEW v_cedula_candidatos AS
  SELECT 
    c.dni,
    c.nombres_completos,
    c.cargo_postula,
    c.tipo_senador,
    c.partido,
    c.region_postula,
    c.foto_url,
    c.nivel_criticidad,
    c.puntaje_transparencia,
    c.alertas_activas,
    c.tiene_sentencia_firme,
    c.proceso_activo,
    c.variacion_patrimonial,
    c.fue_congresista,
    c.numero_lista,
    p.logo_url AS logo_partido
  FROM candidatos c
  LEFT JOIN partidos p ON p.nombre = c.partido
  ORDER BY c.numero_lista ASC NULLS LAST;

-- 10. Verificación post-migración
SELECT 
  cargo_postula,
  tipo_senador,
  COUNT(*) AS total
FROM candidatos
GROUP BY cargo_postula, tipo_senador
ORDER BY cargo_postula, tipo_senador;
