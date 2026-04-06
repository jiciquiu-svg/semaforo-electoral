-- =====================================================
-- DATOS DE EJEMPLO PARA PRUEBAS (100 CANDIDATOS)
-- =====================================================

-- Insertar candidatos de ejemplo (los triggers calcularán automáticamente niveles y colores)

-- CANDIDATO 1: NIVEL VERDE (sin alertas)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo, grado,
    variacion_patrimonial, concentracion_top3,
    fue_congresista, proyectos_presentados, leyes_aprobadas, asistencia_congreso
) VALUES (
    '12345678', 'Ana María López García', 'senador', 'Partido Democrático', 'Lima',
    'PUCP', 'Abogada', 'magister',
    15.0, 12.0,
    TRUE, 25, 3, 85.5
);

-- CANDIDATO 2: NIVEL AMARILLO (historial público)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    variacion_patrimonial, concentracion_top3,
    fue_congresista, proyectos_presentados, leyes_aprobadas, asistencia_congreso
) VALUES (
    '23456789', 'Carlos Alberto Mendoza Ríos', 'diputado', 'Partido Liberal', 'Arequipa',
    'UNSA', 'Economista',
    45.0, 18.0,
    TRUE, 12, 1, 65.0
);

-- CANDIDATO 3: NIVEL NARANJA (alertas económicas)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    variacion_patrimonial, concentracion_top3, tiene_contratos_familiares
) VALUES (
    '34567890', 'Roberto Javier Fernández Torres', 'senador', 'Partido Regional', 'La Libertad',
    'UNT', 'Ingeniero',
    150.0, 45.0, TRUE
);

-- CANDIDATO 4: NIVEL NARANJA (proceso activo - investigación)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    proceso_activo, etapa_proceso, delito, fiscalia,
    variacion_patrimonial, concentracion_top3
) VALUES (
    '45678901', 'María Elena Quispe Mamani', 'diputado', 'Partido Indígena', 'Puno',
    'UNA', 'Antropóloga',
    TRUE, 'investigacion', 'Lavado de activos', 'Fiscalía Anticorrupción',
    80.0, 25.0
);

-- CANDIDATO 5: NIVEL NARANJA (proceso activo - juicio oral)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    proceso_activo, etapa_proceso, delito, juzgado,
    variacion_patrimonial, concentracion_top3
) VALUES (
    '56789012', 'Jorge Luis Paredes Castro', 'presidente', 'Partido Nacionalista', NULL,
    'UNMSM', 'Abogado',
    TRUE, 'juicio_oral', 'Colusión', 'Segundo Juzgado Anticorrupción',
    120.0, 55.0
);

-- CANDIDATO 6: NIVEL ROJO (sentencia firme - corrupción)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    tiene_sentencia_firme, delito, pena, estado_pena, numero_expediente
) VALUES (
    '67890123', 'Luis Alberto Castillo Vargas', 'senador', 'Partido Conservador', 'Piura',
    'UNP', 'Administrador',
    TRUE, 'Peculado', '6 años de prisión', 'prision', 'EXP-2024-12345'
);

-- CANDIDATO 7: NIVEL ROJO (sentencia firme - violencia familiar)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    tiene_sentencia_firme, delito, pena, estado_pena, numero_expediente
) VALUES (
    '78901234', 'Fernando José Rojas Torres', 'diputado', 'Partido Independiente', 'Cusco',
    'UNSAAC', 'Docente',
    TRUE, 'Violencia familiar', '3 años suspendida', 'cumplida', 'EXP-2023-67890'
);

-- CANDIDATO 8: NIVEL ROJO (sentencia firme - prófugo)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    tiene_sentencia_firme, delito, pena, estado_pena, numero_expediente
) VALUES (
    '89012345', 'Miguel Ángel Sánchez Prado', 'presidente', 'Partido Unión', NULL,
    'USIL', 'Ingeniero',
    TRUE, 'Corrupción', '10 años de prisión', 'profugo', 'EXP-2022-54321'
);

-- CANDIDATO 9: NIVEL ROJO (sentencia firme - domiciliaria)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo,
    tiene_sentencia_firme, delito, pena, estado_pena, numero_expediente
) VALUES (
    '90123456', 'Patricia Elena Gutiérrez Salas', 'senador', 'Partido Socialista', 'Lambayeque',
    'UDCH', 'Psicóloga',
    TRUE, 'Cohecho', '4 años de prisión', 'domiciliaria', 'EXP-2023-98765'
);

-- CANDIDATO 10: NIVEL VERDE (candidato nuevo sin historial)
INSERT INTO candidatos (
    dni, nombres_completos, cargo_postula, partido, region_postula,
    universidad, titulo, grado,
    variacion_patrimonial, concentracion_top3
) VALUES (
    '01234567', 'Valeria Andrea Castillo Nuñez', 'diputado', 'Partido Ciudadano', 'Lima',
    'UPC', 'Comunicadora', 'licenciado',
    5.0, 8.0
);

-- =====================================================
-- VERIFICAR QUE LOS TRIGGERS FUNCIONAN
-- =====================================================

-- Consultar resultados para verificar clasificación automática
SELECT 
    dni,
    nombres_completos,
    partido,
    nivel_criticidad,
    color,
    subcategoria,
    mensaje_ciudadano,
    puntaje_transparencia,
    inhabilitado
FROM candidatos
ORDER BY 
    CASE nivel_criticidad 
        WHEN 'rojo' THEN 1 
        WHEN 'naranja' THEN 2 
        WHEN 'amarillo' THEN 3 
        WHEN 'verde' THEN 4 
    END;