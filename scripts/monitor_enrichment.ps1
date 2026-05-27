# Monitor de Enriquecimiento en Tiempo Real
# Ejecutar este script en una terminal aparte para ver el progreso

$ErrorActionPreference = "SilentlyContinue"
Write-Host "📊 MONITOREO DE ENRIQUECIMIENTO ELECTORAL" -ForegroundColor Cyan
Write-Host "----------------------------------------"

while($true) {
    # Ejecutamos el script de stats y limpiamos la salida
    $stats = python scripts/check_stats.py | Select-String "Total Candidatos|Con Foto|Con Formación|Con Experiencia|Pendientes"
    
    Clear-Host
    Write-Host "📊 ESTADO ACTUAL DEL PROCESO ($(Get-Date -Format 'HH:mm:ss'))" -ForegroundColor Cyan
    Write-Host "----------------------------------------"
    foreach ($line in $stats) {
        if ($line -match "Pendientes") {
            Write-Host $line -ForegroundColor Yellow
        } else {
            Write-Host $line -ForegroundColor Green
        }
    }
    Write-Host "----------------------------------------"
    Write-Host "Presiona Ctrl+C para detener el monitoreo."
    
    Start-Sleep -Seconds 15
}
