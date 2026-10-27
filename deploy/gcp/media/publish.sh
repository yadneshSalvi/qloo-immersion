#!/usr/bin/env bash
set -euo pipefail
# Invoke only after the final staged media and publication have been approved.
: "${IMMERSION_MEDIA_BUILD_DIR:?Set IMMERSION_MEDIA_BUILD_DIR to the exact prepared build directory}"
: "${IMMERSION_MEDIA_IMAGE:?Set IMMERSION_MEDIA_IMAGE to a unique Artifact Registry release tag}"
: "${IMMERSION_GCP_PROJECT:=immersion-learn-20261027}"
: "${IMMERSION_REGION:=us-central1}"
script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
gc=${IMMERSION_GCLOUD_WRAPPER:-"$script_dir/../gcloud.sh"}
media_sa="immersion-media@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com"
python3 - "$IMMERSION_MEDIA_BUILD_DIR" <<'PY'
from pathlib import Path
import sys
root=Path(sys.argv[1]).resolve(strict=True)
expected={'.gcloudignore','Dockerfile','IMMERSION-demo.mp4','captions.vtt','cloudbuild.yaml','index.html','nginx.conf','poster'}
if {p.name for p in root.iterdir()} != expected or not all(p.is_file() and not p.is_symlink() for p in root.iterdir()):
    raise SystemExit('The media build directory must contain exactly the eight prepared regular files.')
if '__IMMERSION_' in (root/'index.html').read_text():
    raise SystemExit('Fill the verified public application/source links before publishing.')
if not 0 < (root/'IMMERSION-demo.mp4').stat().st_size <= 128 * 1024 * 1024:
    raise SystemExit('The final MP4 must be nonempty and at most 128 MiB.')
if 'http2 on;' not in (root/'nginx.conf').read_text():
    raise SystemExit('This media service requires the reviewed h2c nginx configuration.')
PY
# This identity must have no project roles or access to application secrets.
policy=$("$gc" projects get-iam-policy "$IMMERSION_GCP_PROJECT" --format=json)
python3 -c 'import json,sys; p=json.load(sys.stdin); member="serviceAccount:"+sys.argv[1]; assert not any(member in b.get("members",[]) for b in p.get("bindings",[])), "The dedicated media account must have no project roles."' "$media_sa" <<<"$policy"
"$gc" builds submit "$IMMERSION_MEDIA_BUILD_DIR" --config="$script_dir/cloudbuild.yaml" \
  --service-account="projects/$IMMERSION_GCP_PROJECT/serviceAccounts/immersion-build@$IMMERSION_GCP_PROJECT.iam.gserviceaccount.com" \
  --substitutions="_IMAGE=$IMMERSION_MEDIA_IMAGE" --quiet
digest=$("$gc" artifacts docker images describe "$IMMERSION_MEDIA_IMAGE" --format='value(image_summary.digest)')
[[ "$digest" =~ ^sha256:[a-f0-9]{64}$ ]] || { printf '%s\n' 'An immutable image digest is required.' >&2; exit 1; }
image="${IMMERSION_MEDIA_IMAGE%:*}@$digest"
"$gc" run deploy immersion-demo --region="$IMMERSION_REGION" --image="$image" \
  --service-account="$media_sa" --use-http2 --port=8080 --cpu=1 --memory=512Mi \
  --cpu-throttling --execution-environment=gen2 --min=0 --min-instances=0 \
  --max=1 --max-instances=1 --concurrency=40 --timeout=300 \
  --clear-network --clear-vpc-connector --clear-env-vars --clear-secrets \
  --no-invoker-iam-check --quiet
"$gc" run services describe immersion-demo --region="$IMMERSION_REGION" --format='value(status.url)'
