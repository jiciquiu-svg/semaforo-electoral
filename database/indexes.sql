-- =====================================================
-- ÍNDICES OPTIMIZADOS PARA BÚSQUEDAS RÁPIDAS
-- =====================================================

-- Índices principales para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_candidatos_dni ON candidatos(dni);
CREATE INDEX IF NOT EXISTS idx_candidatos_partido ON candidatos(partido);
CREATE INDEX IF NOT EXISTS idx_candidatos_nivel ON candidatos(nivel_criticidad);
CREATE INDEX IF NOT EXISTS idx_candidatos_cargo ON candidatos(cargo_postula);
CREATE INDEX IF NOT EXISTS idx_candidatos_region ON candidatos(region_postula);
CREATE INDEX IF NOT EXISTS idx_candidatos_puntaje ON candidatos(puntaje_transparencia DESC);

-- Índice de texto completo para búsqueda por nombre
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS idx_candidatos_nombres_trgm ON candidatos USING GIN (nombres_completos gin_trgm_ops);

-- Índices compuestos para filtros comunes
CREATE INDEX IF NOT EXISTS idx_candidatos_partido_nivel ON candidatos(partido, nivel_criticidad);
CREATE INDEX IF NOT EXISTS idx_candidatos_region_nivel ON candidatos(region_postula, nivel_criticidad);
CREATE INDEX IF NOT EXISTS idx_candidatos_cargo_nivel ON candidatos(cargo_postula, nivel_criticidad);

-- Índices para alertas
CREATE INDEX IF NOT EXISTS idx_candidatos_inhabilitado ON candidatos(inhabilitado);
CREATE INDEX IF NOT EXISTS idx_candidatos_variacion_alta ON candidatos(variacion_patrimonial) WHERE variacion_patrimonial > 100;
CREATE INDEX IF NOT EXISTS idx_candidatos_concentracion_alta ON candidatos(concentracion_top3) WHERE concentracion_top3 > 30;

-- Índices para tablas relacionadas
CREATE INDEX IF NOT EXISTS idx_sentencias_fecha ON sentencias(fecha_sentencia DESC);
CREATE INDEX IF NOT EXISTS idx_procesos_etapa ON procesos_activos(etapa);
CREATE INDEX IF NOT EXISTS idx_aportantes_monto_alto ON aportantes(monto) WHERE monto > 10000;
CREATE INDEX IF NOT EXISTS idx_declaraciones_patrimonio ON declaraciones_juradas(patrimonio_declarado);

-- =====================================================
-- VISTAS PARA REPORTES
-- =====================================================

-- Vista: Resumen por partido
DROP VIEW IF EXISTS vista_resumen_partidos;
CREATE VIEW vista_resumen_partidos AS
SELECT 
    partido,
    COUNT(*) as total_candidatos,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'verde') as verdes,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'amarillo') as amarillos,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'naranja') as naranjas,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'rojo') as rojos,
    ROUND(AVG(puntaje_transparencia), 2) as puntaje_promedio,
    COUNT(*) FILTER (WHERE inhabilitado = TRUE) as inhabilitados
FROM candidatos
GROUP BY partido
ORDER BY puntaje_promedio DESC;

-- Vista: Resumen por región
DROP VIEW IF EXISTS vista_resumen_regiones;
CREATE VIEW vista_resumen_regiones AS
SELECT 
    COALESCE(region_postula, 'Nacional') as region,
    COUNT(*) as total_candidatos,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'rojo') as riesgo_alto,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'naranja') as riesgo_medio,
    ROUND(AVG(puntaje_transparencia), 2) as puntaje_promedio
FROM candidatos
GROUP BY region_postula
ORDER BY riesgo_alto DESC;

-- Vista: Candidatos con alertas activas
DROP VIEW IF EXISTS vista_alertas_activas;
CREATE VIEW vista_alertas_activas AS
SELECT 
    dni,
    nombres_completos,
    partido,
    nivel_criticidad,
    alertas_activas,
    puntaje_transparencia,
    ultima_actualizacion
FROM candidatos
WHERE nivel_criticidad IN ('naranja', 'rojo')
ORDER BY 
    CASE nivel_criticidad 
        WHEN 'rojo' THEN 1 
        WHEN 'naranja' THEN 2 
    END;

-- Vista: Evolución de candidatos por nivel (para gráficos)
DROP VIEW IF EXISTS vista_evolucion_niveles;
CREATE VIEW vista_evolucion_niveles AS
SELECT 
    DATE(ultima_actualizacion) as fecha,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'verde') as verdes,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'amarillo') as amarillos,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'naranja') as naranjas,
    COUNT(*) FILTER (WHERE nivel_criticidad = 'rojo') as rojos
FROM candidatos
WHERE ultima_actualizacion > NOW() - INTERVAL '30 days'
GROUP BY DATE(ultima_actualizacion)
ORDER BY fecha DESC;