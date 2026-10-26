#!/usr/bin/env bash
set -euo pipefail
: "${IMMERSION_IMAGE:?Set IMMERSION_IMAGE to the immutable release image}"
: "${IMMERSION_GCP_PROJECT:=immersion-learn-20261027}"
: "${IMMERSION_DB_SECRET_VERSION:?Set the runtime database secret version}"
: "${IMMERSION_CA_SECRET_VERSION:?Set the database CA secret version}"
gc=${IMMERSION_GCLOUD_WRAPPER:-./deploy/gcp/gcloud.sh}
"$gc" run jobs deploy immersion-runtime-smoke --region=us-central1 --image="$IMMERSION_IMAGE" \
  --service-account="immersion-worker@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com" \
  --network=immersion-private --subnet=immersion-run --vpc-egress=private-ranges-only \
  --cpu=1 --memory=512Mi --tasks=1 --parallelism=1 --max-retries=0 --task-timeout=120s \
  --command=node --args=--import,tsx,deploy/gcp/verify-runtime.mjs \
  --set-env-vars=DATABASE_SSL_MODE=verify-ca,DATABASE_SSL_CA_FILE=/secrets/sql-ca.pem,DATABASE_POOL_MAX=1 \
  --set-secrets="DATABASE_URL=immersion-database-url:$IMMERSION_DB_SECRET_VERSION,/secrets/sql-ca.pem=immersion-sql-ca:$IMMERSION_CA_SECRET_VERSION" --quiet
"$gc" run jobs execute immersion-runtime-smoke --region=us-central1 --wait --quiet
"$gc" run jobs delete immersion-runtime-smoke --region=us-central1 --quiet
