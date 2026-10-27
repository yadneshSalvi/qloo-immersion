# Verification scope

IMMERSION separates cultural ranking, original source material, fixed comprehension checks, optional AI writing feedback, and observed product behavior. Passing software checks does not validate teaching quality or establish a learning gain.

## Local release checks — 26 October 2026 UTC

The release uses Node 22.22.3, pnpm 10.15.0, Next.js 16.4.3, React 19.3.1, and PostgreSQL 17. TypeScript, ESLint, the production build, and `git diff --check` passed.

| Check                             | Result    | What it establishes                                                                                                                                                             |
| --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/domain tests                 | 58 passed | Corpus consistency, deterministic selection and adaptation, model-output validation, provider boundaries, payload limits, TLS configuration, dispatch and worker authentication |
| Real PostgreSQL integration tests | 31 passed | Ownership, assignments, idempotency, immutable records, current source permissions, leases, cancellation, stale inputs, usage reservations, cache and narration access          |
| Playwright browser tests          | 12 passed | Core learning journey, review, recovery, mobile layout, automated accessibility, live-feature states, and audio controls                                                        |
| Actual-provider browser rehearsal | Completed | Real Qloo identity resolution and discovery, real source-grounded AI planning/coaching, local playback, fixed practice and durable review                                       |

The final browser suite passed all twelve tests in one complete run. An earlier contrast issue in inactive passage numbers was corrected before that run. A clean production build with `DATABASE_URL` explicitly empty also passed: database queries start at a request-time boundary, and build systems receive no database credential. The twelve-test run used the compiled production server and finished in 28.3 seconds. Hosted CI is recorded separately below.

Database tests use the separate `immersion_test` database. Browser tests use independent guest cookies against the actual application and PostgreSQL. Tests for provider-dependent UI states explicitly intercept those endpoints with labelled fixtures; they neither establish provider availability nor spend provider credits. The real-provider rehearsal is recorded separately in [live observations](LIVE-OBSERVATIONS.md).

## Material boundaries exercised

- A guest cannot read another guest's sessions, runs, coaching, or narration. Cross-site mutations, invalid content types, oversized input, invalid identifiers, unassigned questions, stale versions, and altered source records are rejected.
- Source and assessment records are checked before use. Withdrawn hosting/transcript permission blocks source delivery, exercise access, review, and narration, including retries. Withdrawing only model-processing permission blocks new AI processing while preserving access to an already generated narration where hosting and transcript permissions still apply.
- A hard self-report explicitly requests extra support and holds the next challenge, even after three perfect comprehension sessions. Fixed scores, working bands, and taste are unchanged. Historical adaptation records remain unchanged. The following lesson opens translations, authored hints and source references, keeps those controls collapsible, and preserves extra support in the preview. Recorded narration initially uses 0.75× only when no saved/user speed is present; it never autoplays.
- A model can propose only eligible source IDs in the permitted Qloo order, with exact source quotes. Invalid proposals produce an explicitly labelled deterministic fallback. Model-written prose cannot change fixed answers, rights, working bands, or provider evidence.
- Durable jobs survive interrupted clients. Reloading a pending search resumes its saved run without another creation request. Coaching recovery restores the draft associated with the latest submitted attempt. A lease, cancellation, or profile/source change is checked before side effects and result release.
- Usage reservations count each bounded provider request. A 24-hour result cache preserves original evidence timestamps and is visibly identified. These are usage limits, not the provider's remaining-credit balance.
- Generated narration supports explicit play/pause, passage seeking, speed changes, keyboard scrubbing and browser-local position restoration. Media endpoints validate source versions/hashes, ownership, byte ranges, and current permission. Three listening pieces use the clearly labelled browser-voice/text fallback.
- Automated WCAG checks cover public and personalized pages. Keyboard testing checks glossary focus return. Small-screen checks inspect overflow at 320px. Manual assistive-technology validation remains outstanding.

## Narration verification

The shipped collection has 15 generated MP3 narrations covering 45 passages and approximately 21 minutes of audio. Source hashes and audio hashes were verified; timed passage boundaries were checked against the original Spanish text. Speech-to-text comparison included reviewed orthographic differences. One file was trimmed after its last source word to remove trailing generated speech, then retranscribed successfully. Three provider-declined pieces were not represented as completed narration. Signal checks found no clipped samples, NaN, or infinite values. These checks are not a claim of independent human listening or educator review.

## Reproduction and limits

Follow the [README](../README.md) for local PostgreSQL setup, then run `pnpm test`, `pnpm test:db`, `pnpm build`, `pnpm typecheck`, `pnpm lint`, and the browser suite against the running app. The committed GitHub workflow creates isolated application/test databases and verifies the production server without provider credentials.

The corpus contains 36 original fictional pieces and 144 fixed exercises. A2/B1 bands, translations, glosses, and answer keys are provisional and pending independent educator review. There is no certified placement, pronunciation assessment, third-party creator partnership, randomized learner study, or measured retention/fluency improvement. Browser-scoped guest access is not a production account/recovery system. The guest cookie expires after 30 days; stored guest data persists until explicit deletion.

## GitHub CI

The initial run, `40420713119` on `109d44e`, passed the credential-free build, typecheck, lint, 58 unit tests, 31 PostgreSQL tests and migration. Its browser suite found an ambiguous test locator: the production framework adds its own route-announcer alert. The connection-loss assertion was narrowed to its actual message and verified against production Next. The corrected run, [40422390513](https://github.com/yadneshSalvi/qloo-immersion/actions/runs/40422390513) on `e65f02e`, passed in two minutes: clean credential-free build, typecheck, lint, 58 unit tests, 31 PostgreSQL tests, migration and all 12 production browser tests. No failed run is counted as a release pass.

## Hosted release

The [hosted application](https://immersion-web-dnp3wctt7a-uc.a.run.app) passed **14 independent acceptance checks** on 26 October 2026 UTC in 43.8 seconds. The run blocked paid provider endpoints and recorded zero attempts to call them, zero unexpected external requests, and zero browser errors. Both disposable guests were deleted afterward.

The hosted pass covered fresh onboarding; source practice and save/reload; perfect fixed answers plus a hard self-report producing extra support without changing score, taste or A2 bands; next-session extra hints/source/translation and preserved choice; actual MP3 decoding, passage/keyboard seek and saved playback-rate override; 206 byte ranges, suffix ranges, HEAD and invalid-range rejection; foreign and anonymous media rejection; review scheduling and idempotency/conflict behavior; export, guest isolation, cross-origin and oversized-input rejection; five routes without overflow at 390px; accurate retention text; and scoped deletion.

Cloud migration and runtime checks separately verified the instance-specific database CA, rejection of an unrelated CA, fifteen state-table grants, read-only access to the two catalog tables, and absence of administrative/schema/other-table access. The private worker rejects anonymous requests; the public app uses Secure/HttpOnly/SameSite=Lax guest cookies. Automatic Scheduler dispatch returned HTTP 200.

The application image is `sha256:21961b5ad7176cfede3f533680d3525e0b6cf66b188c2e7be8e872151dd08275`, with web revision `immersion-web-00004-266` and worker revision `immersion-worker-00003-jpl`. Actual hosted provider observations are recorded separately from this provider-free acceptance run.

## Demonstration film — v0.2.0

The reviewed 276.600-second export contains 8,298 frames at 1920×1080 and 30 fps. It uses actual hosted product captures and an explicitly fictional learner. Real input and clicks stay at their performed speed; the full app opens and closes the film, with one gentle focus move and no added headings or burned captions. All seventy native English caption cues are optional and off by default.

The final H.264/AAC file passed complete decode, inspection of 140 encoded review frames including all edit seams, and caption bounds/overlap validation. Actual encoded audio measures −14.22 LUFS and −1.42 dBTP. The complete original Spanish sentence has zero English overlap and source correlation 0.997789. A full encoded model-listener audition passed after targeted repairs; this is not a claim of human listening or educator review.

The [public player](https://immersion-demo-dnp3wctt7a-uc.a.run.app/) passed full-file SHA-256, asset MIME/hash, HTTP/2, start/end 206 ranges, security headers and excluded-route checks. Fresh-browser metadata reported 276.6 seconds, 1920×1080 and playback rate 1. Playback advanced from 0 to 4.686 seconds; seeks to the Spanish-sample result at 100.534, complete typed opinion at 174.817 and notebook ending at 271.679 loaded without media errors. Optional English captions visibly rendered while playback reached 179.917 during the feedback request and at the ending. Reload restored time zero, paused, with captions disabled.

The isolated media service is revision `immersion-demo-00002-qgz`; its identity remains roleless and has no application environment, secrets, volumes or VPC connection. Application and worker revisions are unchanged. The [release record](RELEASE.md#demonstration-film-verification) contains the exact movie hash, production checks and deployment details.

The v0.2.0 media/documentation commit is subject to the same `Verify IMMERSION` workflow: credential-free production build, typecheck, lint, unit tests, PostgreSQL integration tests, migration and production browser tests. The GitHub release links its exact passing commit and CI run; earlier application passes above remain separately dated evidence.
