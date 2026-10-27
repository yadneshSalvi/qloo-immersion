# IMMERSION v0.2.0

This release replaces the demonstration film with a 276.6-second walkthrough of the working application. It updates the isolated static media service and its public documentation. The application and worker remain on their existing revisions.

| Item | Status or location |
| --- | --- |
| Demonstration film | [Watch IMMERSION](https://immersion-demo-dnp3wctt7a-uc.a.run.app/) |
| Hosted application | [Open IMMERSION](https://immersion-web-dnp3wctt7a-uc.a.run.app/) |
| Application baseline | [`e65f02e`](https://github.com/yadneshSalvi/qloo-immersion/commit/e65f02e2dda65ff469207efb88046c66a8f255e8), unchanged by this media release |
| Required release CI | [Verify IMMERSION](https://github.com/yadneshSalvi/qloo-immersion/actions/workflows/ci.yml); the GitHub release links the passing run for its exact commit |
| Media revision | `immersion-demo-00002-qgz` |

## What the film shows

Maya Demo is a fictional adult learner. She confirms the exact Rosalía artist identity and follows a **cached Qloo ranking** through the film reference _Coco_ and an editorial theme into an original Spanish story. A source-grounded AI study invitation provides a focus, with an exact quotation available for inspection. These are separate contributions: Qloo supplies cultural ranking, IMMERSION supplies the editorial connection, and the AI proposes study guidance within checked source constraints.

The session includes a complete sentence from the story’s original Spanish narration, contextual vocabulary, fixed source practice and the expression `Primero`. Maya types her complete 99-character opinion and separately consents to AI feedback. The coach suggests a missing preposition and an accent correction; it does not automatically rewrite her draft or change her source-question results.

Her 3/3 source result and request for more support are considered separately. A2 stays unchanged, and the next **editorial** story opens with translations and extra hints, with narration paused at 0.75×. This transition makes no new Qloo request. She recalls `ensayan` in the notebook and sees a next-day review scheduled. This demonstrates the implemented schedule, not measured learning or retention.

The film explains the application’s Google Cloud web, worker and database separation. The underlying product remains the 36-piece original AI-assisted collection described in the [README](../README.md), with the limits documented in [verification](VERIFICATION.md) and [live observations](LIVE-OBSERVATIONS.md).

## Demonstration film verification

The film begins and ends on the full application. Real cursor movement, clicks and all typed characters retain their performed speed. Ordinary edits remove inactive waits and repeated steps. One gentle 1.12× focus keeps both reflection choices visible. There are no added headings, burned captions or global speed changes. Seventy native English caption cues are optional and off by default.

The approved narration contains 575 words. Its complete Spanish source excerpt uses media time 0.400–4.700 seconds, with English absent and music dipped throughout. The picture then cuts forward to the actual recorded pause; the player clock is not altered. Original captures and both superseded attempts remain private and preserved.

| Encoded check | Verified result |
| --- | --- |
| Duration and frames | 276.600 seconds; 8,298 frames |
| Picture | 1920×1080, 30 fps, H.264 |
| Audio | Stereo 48 kHz AAC; −14.22 LUFS integrated; −1.42 dBTP |
| Complete decode | Passed |
| Visual inspection | 140 encoded review frames, including all edit seams and the camera move |
| Spanish source correlation | 0.997789 with zero English overlap |
| Complete encoded audio audition | Model-listener PASS; no human listening claim |
| MP4 size | 100,157,214 bytes |

Final MP4 SHA-256: `acac566eb983207aad39f3b1a30aea2cec5ea55011bb25b88835d27845bb5951`.

Anonymous full download matches that exact hash. Beginning and ending byte ranges return HTTP 206 with the correct bytes. Poster and WebVTT hashes, MIME types, HTTP/2, security headers, health and excluded-path 404s pass.

Fresh public-browser verification confirmed 276.6-second metadata, 1920×1080 playback at 1×, initially disabled captions and advancing playback. Seeking reached the Spanish-sample result, complete typed opinion and full notebook ending without media errors. Enabling English displayed the correct captions during the real feedback request and ending. Reload returned to time zero, paused, with captions disabled.

## Deployment and boundaries

The static player runs with a dedicated roleless media identity, no application environment or secrets, no volumes or VPC connection, and minimum zero / maximum one instance. Its exact eight-file build context excludes captures, transcripts, private planning and provider data. End-to-end HTTP/2 with nginx h2c supports the larger MP4; preparation and publication enforce a 128 MiB file bound. Media URLs carry `?v=0.2.0` to refresh older browser caches.

Cloud Build `57edf724-873f-448d-a9ea-a67248717639` produced image `sha256:5ac1a245e3dbfed3522d6cdbcfe1ac5cb0952349bb3a3f5ad68586287c8a2ba0`. Media revision `immersion-demo-00002-qgz` receives 100% of traffic. Application `immersion-web-00004-266` and worker `immersion-worker-00003-jpl` remain unchanged. See [media deployment](../deploy/gcp/media/README.md).

The original stories, provisional working bands, translations, glosses and answer keys remain pending independent educator review. Cultural affinity does not establish individual preference or teaching effectiveness. No fluency, retention or learning improvement is claimed. Guest-cookie expiry does not delete stored guest data; explicit owner deletion remains available. Licensing and provider/data boundaries are unchanged; see [content licensing](../CONTENT_LICENSE.md) and [architecture](ARCHITECTURE.md).
