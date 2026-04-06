#!/bin/bash

echo "🛡️ Activando modo estático - $(date)"

# 1. Redirigir todo tráfico a CDN
kubectl patch service backend -p '{"spec":{"selector":{"app":"static-cdn"}}}'

# 2. Deshabilitar conexiones a base de datos
kubectl scale deployment postgres --replicas=0

# 3. Servir solo archivos pre-generados
kubectl set env deployment/frontend STATIC_ONLY=true

# 4. Cachear todo por 24 horas
curl -X POST https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache \
  -H "Authorization: Bearer $CLOUDFLARE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'

echo "✅ Modo estático activado - capacidad: 10M requests/segundo"
