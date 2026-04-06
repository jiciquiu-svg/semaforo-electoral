#!/bin/bash

echo "🔄 Promoviendo réplica a primaria - $(date)"

LATEST_REPLICA=$(kubectl get pods -l app=postgres-replica -o json | \
  jq -r '.items | sort_by(.metadata.creationTimestamp) | last | .metadata.name')

kubectl exec "$LATEST_REPLICA" -- \
  pg_ctl promote -D /var/lib/postgresql/data

kubectl patch service postgres -p \
  '{"spec":{"selector":{"state":"primary"}}}'

kubectl scale deployment postgres-replica --replicas=3

echo "✅ Nueva primaria: $LATEST_REPLICA"
