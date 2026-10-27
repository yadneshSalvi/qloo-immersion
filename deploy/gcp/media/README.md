# IMMERSION demonstration film hosting

This isolated static service serves only the approved final MP4, poster and WebVTT captions. The page offers native playback controls, optional English captions that are off by default, downloads, and verified application/source links. It uses a dedicated roleless media identity, minimum zero / maximum one instance, and no database, application secrets, VPC or provider credentials.

Prepare the context only after reviewing the final assets. Keep the film project, captures, production transcripts, plans and raw provider data outside the public repository and build context. Run from the IMMERSION repository:

```sh
python3 deploy/gcp/media/prepare.py \
  --video /absolute/path/to/IMMERSION-demo.mp4 \
  --poster /absolute/path/to/IMMERSION-poster.jpg \
  --captions /absolute/path/to/IMMERSION-demo.vtt \
  --app-url https://VERIFIED_PUBLIC_APP_ORIGIN \
  --source-url https://github.com/VERIFIED_OWNER/VERIFIED_REPOSITORY \
  --output /absolute/private/new-media-build
```

The new output directory must be outside the repository. Preparation checks an MP4 no larger than **128 MiB**, PNG/JPEG poster data and nonempty WebVTT captions. It substitutes the public URLs, selects the poster MIME type and stages exactly eight regular files: `.gcloudignore`, `Dockerfile`, `cloudbuild.yaml`, `nginx.conf`, `index.html`, `IMMERSION-demo.mp4`, `poster` and `captions.vtt`. The generated ignore file admits only those files. Keep the printed media hashes with private release evidence. Media URLs use `?v=0.2.0`; change that cache version when replacing approved assets in a later release.

The service requires **nginx h2c and Cloud Run end-to-end HTTP/2**. HTTP/1 response limits are too small for this movie. The pinned nginx configuration enables `http2 on;`, and `publish.sh` uses `--use-http2`. Both preparation and publication enforce the 128 MiB MP4 bound. Do not remove one half of this transport configuration.

After final publication approval, use the dedicated `immersion-media` service account with no project roles or resource-level secret grants. Set `IMMERSION_MEDIA_BUILD_DIR` to the prepared directory and `IMMERSION_MEDIA_IMAGE` to a unique tag in the project's `immersion-images` Artifact Registry repository. Select the authorized Google Cloud account/wrapper as described in the parent deployment README, then run `./deploy/gcp/media/publish.sh`.

The script checks the exact context, file bound, h2c configuration and roleless identity, builds the staged files, resolves an immutable digest and deploys only `immersion-demo` in `us-central1`. It clears environment variables, secrets and VPC connections. The service uses request-based compute, 512 MiB memory and scale-to-zero. Builds, registry storage, traffic and compute are billed separately.

Verify anonymous access, a complete download with the approved SHA-256, MIME types, start/end HTTP 206 ranges with correct bytes, and fresh-browser playback, seeking and optional captions before sharing a release. Reload must leave captions off. Nginx allows only the page, three assets and health endpoint, disables directory listing/access logs and provides restrictive response headers.

## Verified v0.2.0 publication

[The public player](https://immersion-demo-dnp3wctt7a-uc.a.run.app/) serves the 276.600-second film at 1920×1080 and 30 fps. The 100,157,214-byte MP4 has SHA-256 `acac566eb983207aad39f3b1a30aea2cec5ea55011bb25b88835d27845bb5951`. Full download/hash, HTTP/2, range requests, poster/captions, headers, health and 404 allowlist checks pass. Fresh-browser playback, seeking through the Spanish excerpt, complete opinion and ending, visible optional captions, and default-off reload state also pass.

Revision `immersion-demo-00002-qgz` receives 100% traffic. Build `57edf724-873f-448d-a9ea-a67248717639` produced image `sha256:5ac1a245e3dbfed3522d6cdbcfe1ac5cb0952349bb3a3f5ad68586287c8a2ba0`. Runtime inspection confirms h2c, the existing roleless identity, minimum zero / maximum one, and no environment, secrets, volumes or VPC. Application `immersion-web-00004-266` and worker `immersion-worker-00003-jpl` are unchanged. See the [release verification](../../../docs/RELEASE.md).
