#!/usr/bin/env bash
set -euo pipefail
: "${GCLOUD_BIN:=gcloud}"
: "${IMMERSION_GCP_PROJECT:=immersion-learn-20261027}"
: "${IMMERSION_GCP_ACCOUNT:?Set IMMERSION_GCP_ACCOUNT to the authorized Google Cloud account}"
exec "$GCLOUD_BIN" --account="$IMMERSION_GCP_ACCOUNT" --project="$IMMERSION_GCP_PROJECT" --billing-project="$IMMERSION_GCP_PROJECT" "$@"
