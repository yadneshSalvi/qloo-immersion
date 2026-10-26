#!/usr/bin/env bash
set -euo pipefail
: "${IMMERSION_GCP_PROJECT:=immersion-learn-20261027}"
: "${IMMERSION_REGION:=us-central1}"
gc=${IMMERSION_GCLOUD_WRAPPER:-./deploy/gcp/gcloud.sh}
worker_url=$("$gc" run services describe immersion-worker --region="$IMMERSION_REGION" --format='value(status.url)')
if "$gc" scheduler jobs describe immersion-worker-recovery --location="$IMMERSION_REGION" --format='value(name)' >/dev/null 2>&1; then mode=update; headers=(--update-headers=Content-Type=application/json); else mode=create; headers=(--headers=Content-Type=application/json); fi
"$gc" scheduler jobs "$mode" http immersion-worker-recovery --location="$IMMERSION_REGION" \
  --schedule='* * * * *' --time-zone=Etc/UTC --uri="$worker_url/dispatch" --http-method=POST \
  "${headers[@]}" --message-body='{}' \
  --oidc-service-account-email="immersion-invoker@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com" \
  --oidc-token-audience="$worker_url" --attempt-deadline=180s \
  --max-retry-attempts=1 --min-backoff=30s --max-backoff=300s --quiet
