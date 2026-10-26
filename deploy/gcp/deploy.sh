#!/usr/bin/env bash
set -euo pipefail
# Run from IMMERSION after release freeze, migration, grants, and runtime verification.
: "${IMMERSION_IMAGE:?Set IMMERSION_IMAGE to the immutable release image}"
: "${IMMERSION_GCP_PROJECT:=immersion-learn-20261027}"
: "${IMMERSION_REGION:=us-central1}"
: "${IMMERSION_DB_SECRET_VERSION:?Set runtime database secret version}"
: "${IMMERSION_CA_SECRET_VERSION:?Set database CA secret version}"
: "${IMMERSION_QLOO_SECRET_VERSION:?Set Qloo secret version}"
: "${IMMERSION_OPENAI_SECRET_VERSION:?Set OpenAI secret version}"
: "${IMMERSION_BRIDGES_SECRET_VERSION:?Set reviewed cultural bridge secret version}"
gc=${IMMERSION_GCLOUD_WRAPPER:-./deploy/gcp/gcloud.sh}
worker_sa="immersion-worker@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com"
web_sa="immersion-web@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com"
invoker_sa="immersion-invoker@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com"
db_secrets="DATABASE_URL=immersion-database-url:$IMMERSION_DB_SECRET_VERSION,/secrets/sql-ca.pem=immersion-sql-ca:$IMMERSION_CA_SECRET_VERSION"
./deploy/gcp/configure-logging.sh
common=(--image="$IMMERSION_IMAGE" --region="$IMMERSION_REGION" --network=immersion-private --subnet=immersion-run --vpc-egress=private-ranges-only --cpu=1 --cpu-throttling --execution-environment=gen2 --min-instances=0 --quiet)
"$gc" run deploy immersion-worker "${common[@]}" \
  --service-account="$worker_sa" --memory=1Gi --min=0 --max=1 --max-instances=1 --concurrency=1 --timeout=180 \
  --startup-probe=httpGet.path=/health,httpGet.port=8080,timeoutSeconds=5,periodSeconds=10,failureThreshold=24 \
  --invoker-iam-check --no-allow-unauthenticated --command=node --args=--import,tsx,scripts/worker.ts \
  --set-env-vars=WORKER_AUTH_MODE=cloud-run,DATABASE_SSL_MODE=verify-ca,DATABASE_SSL_CA_FILE=/secrets/sql-ca.pem,DATABASE_POOL_MAX=2,QLOO_BASE_URL=https://hackathon.api.qloo.com,OPENAI_MODEL=gpt-6.1-sol,QLOO_DAILY_CALL_LIMIT=100,QLOO_GUEST_DAILY_CALL_LIMIT=15,MODEL_DAILY_CALL_LIMIT=120,MODEL_GUEST_DAILY_CALL_LIMIT=12,IMMERSION_CULTURAL_BRIDGES_FILE=/secrets/cultural-bridges.json \
  --set-secrets="$db_secrets,QLOO_API_KEY=immersion-qloo-api-key:$IMMERSION_QLOO_SECRET_VERSION,OPENAI_API_KEY=immersion-openai-api-key:$IMMERSION_OPENAI_SECRET_VERSION,/secrets/cultural-bridges.json=immersion-cultural-bridges:$IMMERSION_BRIDGES_SECRET_VERSION"
"$gc" run services add-iam-policy-binding immersion-worker --region="$IMMERSION_REGION" --member="serviceAccount:$invoker_sa" --role=roles/run.invoker --quiet
worker_url=$("$gc" run services describe immersion-worker --region="$IMMERSION_REGION" --format='value(status.url)')
./deploy/gcp/scheduler.sh
"$gc" run deploy immersion-web "${common[@]}" \
  --service-account="$web_sa" --memory=512Mi --min=1 --max=2 --max-instances=2 --concurrency=20 --timeout=60 \
  --startup-probe=tcpSocket.port=8080,timeoutSeconds=1,periodSeconds=10,failureThreshold=24 \
  --no-invoker-iam-check --set-secrets="$db_secrets" \
  --set-env-vars="WORKER_AUTH_MODE=cloud-run,DATABASE_SSL_MODE=verify-ca,DATABASE_SSL_CA_FILE=/secrets/sql-ca.pem,DATABASE_POOL_MAX=4,LIVE_QLOO_ENABLED=1,LIVE_COACHING_ENABLED=1,WORKER_URL=$worker_url,GOOGLE_CLOUD_PROJECT=$IMMERSION_GCP_PROJECT,IMMERSION_TASKS_LOCATION=$IMMERSION_REGION,IMMERSION_TASKS_QUEUE=immersion-research,IMMERSION_TASKS_INVOKER_SERVICE_ACCOUNT=$invoker_sa"
web_url=$("$gc" run services describe immersion-web --region="$IMMERSION_REGION" --format='value(status.url)')
"$gc" run services update immersion-web --region="$IMMERSION_REGION" --update-env-vars="APP_ORIGIN=$web_url" --quiet
printf '%s\n' "$web_url"
