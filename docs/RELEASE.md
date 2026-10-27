# IMMERSION v0.1.0

The application and demonstration film are deployed and verified.

| Item                        | Status or location                                                                                          |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Hosted application          | [Open IMMERSION](https://immersion-web-dnp3wctt7a-uc.a.run.app)                                             |
| Verified application commit | [`e65f02e`](https://github.com/yadneshSalvi/qloo-immersion/commit/e65f02e2dda65ff469207efb88046c66a8f255e8) |
| GitHub CI                   | [Run 40422390513 — passed](https://github.com/yadneshSalvi/qloo-immersion/actions/runs/40422390513)         |
| Demonstration film URL      | [Watch the film](https://immersion-demo-dnp3wctt7a-uc.a.run.app)                                            |

## What is included

IMMERSION connects an explicitly confirmed cultural favorite to an original Spanish learning path. Qloo ranks a reviewed shortlist of real film references; editorial themes connect those references to eligible stories. A bounded AI agent inspects the eligible source material and proposes study invitations. Deterministic checks enforce source identity, permissions, working band, allowed order and exact supporting quotations. The films are cultural references; the lessons are IMMERSION's own fiction.

The collection contains **36 original AI-assisted fictional pieces**, split between 18 reading and 18 listening pieces, with provisional A2/B1 working bands across six cultural themes. It includes 108 source-question items and 36 expression exercises. Fifteen listening pieces have approved prebuilt synthetic Spanish MP3 narration with timed passages; three provide clearly labelled browser-voice/text fallback. Playback is explicit and supports passage seeking, speed changes, keyboard scrubbing and saved position.

The learner can save contextual vocabulary, complete fixed source practice, and separately consent to optional feedback on a typed opinion. Generated corrections cite the assigned source and do not change the fixed answer key or working band. Review uses an explicit 1/3/7/14-day schedule.

Taste and support requests remain separate from comprehension scores. Asking for more support holds the challenge even after a perfect result and carries extra help into the next lesson: visible translations, expanded authored hints and source references, and initial 0.75× recorded narration when no user-selected speed exists. Help remains closable, an independent-reading option remains available, and audio never autoplays.

## Verified behavior

| Check                         | Result                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| Unit/domain tests             | 58 passed                                                       |
| Real PostgreSQL tests         | 31 passed                                                       |
| Production browser tests      | 12 passed                                                       |
| Independent hosted acceptance | 14 checks passed; zero browser errors or paid-provider attempts |
| Clean production build        | Passed with `DATABASE_URL` explicitly empty                     |
| TypeScript and ESLint         | Passed                                                          |

The hosted acceptance pass covered a fresh guest journey, source practice, review scheduling and replay, requested extra support, actual MP3 decoding and byte ranges, saved playback choices, export, deletion, ownership boundaries, cross-origin/oversized-input rejection, and mobile layout. Both disposable test guests were deleted. See [verification scope and results](VERIFICATION.md) for the limits of these checks.

A separate real-provider hosted walkthrough used the fictional Maya Demo profile. Live identity resolution completed in 5.979 seconds, discovery in 8.755 seconds with saved AI planning, and source-grounded writing feedback in 7.677 seconds. All three succeeded on attempt one. These are observed creation-to-completion times, including application work, not provider benchmarks.

That walkthrough confirmed Rosalía, received six eligible film connections, studied _El ensayo del domingo_ through _Coco_, played its approved narration, completed 3/3 fixed source questions and the expression exercise, requested grounded writing feedback, and scheduled a saved word for the following day. A subsequent request for extra support retained A2 and held the challenge. The next editorial lesson, _Un disco para la tarde_, opened its translations, authored hint and source panel, with narration paused at 0.75×; it remained in progress at the first question. That transition made no new Qloo call. The initial coverage check plus local and hosted application rehearsals account for **13 observed Qloo requests and 8 OpenAI model steps**; narration production is separate. The [live-observation record](LIVE-OBSERVATIONS.md) distinguishes those runs from fixtures and explains the comparison and request counts.

## Deployment

The release uses a public Cloud Run web service, a private authenticated worker, Cloud Tasks/Scheduler dispatch, and private Cloud SQL PostgreSQL 17. Provider credentials and reviewed canonical mappings are available only to the worker. Database connections verify the instance-specific CA, and runtime database privileges are limited to application state and read-only catalog access. See [deployment instructions](../deploy/gcp/README.md).

The verified application image is `sha256:21961b5ad7176cfede3f533680d3525e0b6cf66b188c2e7be8e872151dd08275`. The web revision is `immersion-web-00004-266`; the worker revision is `immersion-worker-00003-jpl`.

## Scope and limitations

This is an authored demonstration collection with real provider integration. Story language, provisional bands, translations, glosses and answer keys remain pending independent educator review. Cultural affinity does not establish source rights, individual preference, language difficulty or teaching effectiveness. These synthetic product rehearsals are not a learner study, and no learning, retention or fluency improvement is claimed.

The product has browser-scoped guest access, owner export and explicit deletion; it has no account recovery or cross-device sign-in. The guest cookie expires after 30 days. Cookie expiry or clearing does not delete stored guest data, which remains until explicit deletion. There is no microphone recording or pronunciation assessment. Provider operations are bounded and may fail or reach configured limits; labelled editorial browsing and source practice remain available.

Application code is MIT licensed. Original AI-assisted story text is dedicated under CC0-1.0 to the extent rights exist. No third-party film media is included, and these licenses do not grant rights to Qloo data or referenced works. See [content licensing](../CONTENT_LICENSE.md) and [narration provenance](../assets/audio/README.md).

## Demonstration film verification

The 171-second film shows the actual hosted walkthrough using a fictional learner. Its four narration blocks were generated with Gemini 3.1 Flash TTS (Kore). A multilingual Deepgram pass supplied 350 word timestamps; approved names and Spanish spellings were corrected in the captions while preserving those timings. Sixty-seven caption groups run from 0.920 to 166.645 seconds without overlap or out-of-bounds cues. Original music, original story artwork and actual interface captures accompany the narration.

The editable preview was reviewed before export. The final 1920×1080, 30 fps H.264/AAC file decoded without errors; seventeen decoded keyframes and twenty-two transition frames were visually checked. Rendered audio measured −14.54 LUFS integrated and −1.51 dB true peak, with no clipped samples. These are signal and transcript checks, not a claim of human listening review.

The final MP4 is **9,687,381 bytes**, with SHA-256 `e3f8203a8a825c5037375077b19fc693d8a313c432e3c46441c8f72cff3872f1`. Raw captures, alignment responses and the editable production archive remain private.

The [public player](https://immersion-demo-dnp3wctt7a-uc.a.run.app) serves the approved movie, poster and English WebVTT from a separate roleless Cloud Run service with no application environment, secrets or VPC connection. Anonymous complete downloads matched the approved hashes and MIME types; MP4 HEAD and byte-range requests returned the expected size and HTTP 206. A fresh in-app browser verified actual playback advancing, seeking to approximately 110 and 125 seconds, and rendering the optional English captions without media or console errors. The optional track was returned to its default off state because the film also has burned-in captions.

The media revision is `immersion-demo-00001-r4s`, built by `8ce8b2fb-0395-4d56-90e4-b4af98648ca6` from image `sha256:4fb13e75557a381e5a84591760a9402368f0c4a620c8cb6b10174d0959da71bd`. Its minimum instance count is zero and maximum is one. See [media deployment](../deploy/gcp/media/README.md).
