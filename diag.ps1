Write-Host "🧠 MODO CEREBRO - DIAGNÓSTICO" -ForegroundColor Cyan
Write-Host "==============================" -ForegroundColor Cyan

# 1. Contenedor vivo?
docker ps --filter "name=candidatos-postgres" --format "table {{.Names}}\t{{.Status}}"

# 2. Cuántos candidatos hay ahora?
try {
    $count = docker exec candidatos-postgres psql -U admin -d candidatos_db -t -c "SELECT COUNT(*) FROM candidatos;" 2>$null
    Write-Host "Candidatos en BD: $count" -ForegroundColor Yellow
} catch {
    Write-Host "Error al contar candidatos" -ForegroundColor Red
}

# 3. Proceso python corriendo?
Get-Process python* -ErrorAction SilentlyContinue | Select-Object Id, CPU, WorkingSet

# 4. Checkpoint existe?
if (Test-Path checkpoint.json) { 
    Write-Host "Checkpoint encontrado:" -ForegroundColor Green
    Get-Content checkpoint.json 
} else { 
    Write-Host "No checkpoint - proceso no iniciado o completado" -ForegroundColor Red
}

# 5. Últimos logs
Write-Host "`nÚltimos 3 logs:" -ForegroundColor Cyan
try {
    docker exec candidatos-postgres psql -U admin -d candidatos_db -c "SELECT candidato_dni, estado, fecha_intento FROM logs_extraccion ORDER BY fecha_intento DESC LIMIT 3;" 2>$null
} catch {
    Write-Host "Error al obtener logs" -ForegroundColor Red
}
