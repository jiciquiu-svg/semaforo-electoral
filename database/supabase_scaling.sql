-- Configurar réplicas de lectura automáticas
ALTER DATABASE candidatos_db SET 
  max_connections = 5000,
  shared_buffers = '8GB',
  effective_cache_size = '24GB',
  maintenance_work_mem = '2GB';

-- Crear réplicas en diferentes regiones
-- Sao Paulo (sa-east-1) - Principal
-- Virginia (us-east-1) - Réplica 1
-- Frankfurt (eu-central-1) - Réplica 2
-- Singapur (ap-southeast-1) - Réplica 3

-- Configurar pool de conexiones con PgBouncer
CREATE EXTENSION IF NOT EXISTS pgbouncer;
ALTER SYSTEM SET pgbouncer.enabled = true;
ALTER SYSTEM SET pgbouncer.pool_mode = 'transaction';
