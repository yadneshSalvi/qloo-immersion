# IMMERSION demonstration film hosting

This separate static service serves only the approved final MP4, poster and WebVTT captions. The page offers native playback controls, optional English captions, downloads, and verified application/source links. It uses a dedicated roleless media identity, minimum zero / maximum one instance, and no database, secrets, VPC, provider credentials or application state.

Prepare the context only after reviewing the final assets. Never upload the film project, captures, production transcripts, plans, or raw provider data. Run from the IMMERSION repository:

```sh
python3 deploy/gcp/media/prepare.py \
  --video /absolute/path/to/IMMERSION-demo.mp4 \
  --poster /absolute/path/to/IMMERSION-poster.png \
  --captions /absolute/path/to/IMMERSION-demo.vtt \
  --app-url https://VERIFIED_PUBLIC_APP_ORIGIN \
  --source-url https://github.com/VERIFIED_OWNER/VERIFIED_REPOSITORY \
  --output /absolute/private/new-media-build
```

The output must be outside this repository. Preparation checks an MP4 container no larger than 30 MiB, PNG/JPEG poster data, and nonempty WebVTT captions. It substitutes the public URLs, selects the poster MIME type, and stages exactly eight regular files: `.gcloudignore`, `Dockerfile`, `cloudbuild.yaml`, `nginx.conf`, `index.html`, `IMMERSION-demo.mp4`, `poster`, and `captions.vtt`. The generated ignore file admits only those eight files. Save the printed SHA-256 media manifest with private release evidence.

After final publication approval, create the dedicated `immersion-media` service account with no project roles. It must also have no resource-level secret grants. Set `IMMERSION_MEDIA_BUILD_DIR` to the prepared directory and `IMMERSION_MEDIA_IMAGE` to a unique tag in the project's `immersion-images` Artifact Registry repository. Select the authorized Google Cloud account/wrapper as described in the parent deployment README, then run `./deploy/gcp/media/publish.sh`.

The script verifies the exact context and roleless identity, builds only the staged files, resolves an immutable digest, and deploys `immersion-demo` in `us-central1`. It explicitly clears environment variables, secrets and VPC connections. The service uses request-based compute, 512 MiB memory and scale-to-zero; builds, registry storage, traffic and compute usage are billed separately. No media or application service is modified until publication is approved and the script is run.

Before sharing the public HTTPS URL, verify anonymous page access, asset SHA-256 matches, MIME types (`video/mp4`, `image/png` or `image/jpeg`, and `text/vtt`), a 206 response with correct `Content-Range`, and playback, seeking and optional native captions in a fresh browser. Nginx allows only the page, three assets and health endpoint, disables directory listing/access logs, and supplies restrictive response headers. Never publish unfilled URL placeholders.

The approved release is published at [IMMERSION demo film](https://immersion-demo-dnp3wctt7a-uc.a.run.app), revision `immersion-demo-00001-r4s`. Cloud Build `8ce8b2fb-0395-4d56-90e4-b4af98648ca6` produced the digest-pinned media image `sha256:4fb13e75557a381e5a84591760a9402368f0c4a620c8cb6b10174d0959da71bd`. Anonymous page/health responses, all three downloaded asset hashes and MIME types, MP4 HEAD metadata, and HTTP 206 byte ranges passed verification. The service configuration confirms the dedicated media account, minimum zero / maximum one, and no environment variables, secrets, volumes or VPC connection. Final MP4 SHA-256: `e3f8203a8a825c5037375077b19fc693d8a313c432e3c46441c8f72cff3872f1`.
