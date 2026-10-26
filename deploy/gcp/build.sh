#!/usr/bin/env bash
set -euo pipefail
: "${IMMERSION_IMAGE:?Set IMMERSION_IMAGE to a unique Artifact Registry release tag}"
: "${IMMERSION_GCP_PROJECT:=immersion-learn-20261027}"
gc=${IMMERSION_GCLOUD_WRAPPER:-./deploy/gcp/gcloud.sh}
"$gc" builds submit . --config=deploy/gcp/cloudbuild.yaml \
  --service-account="projects/$IMMERSION_GCP_PROJECT/serviceAccounts/immersion-build@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com" \
  --substitutions="_IMAGE=$IMMERSION_IMAGE" --quiet
