# Verification scope

IMMERSION separates cultural ranking, original source material, fixed comprehension checks, optional AI writing feedback, and observed product behavior. Passing software checks does not validate teaching quality or establish a learning gain.

## Local release checks — 26 October 2026 UTC

The release uses Node 22.22.3, pnpm 10.15.0, Next.js 16.4.3, React 19.3.1, and PostgreSQL 17. TypeScript, ESLint, the production build, and `git diff --check` passed.

| Check                             | Result    | What it establishes                                                                                                                                                             |
| --------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Unit/domain tests                 | 58 passed | Corpus consistency, deterministic selection and adaptation, model-output validation, provider boundaries, payload limits, TLS configuration, dispatch and worker authentication |
| Real PostgreSQL integration tests | 31 passed | Ownership, assignments, idempotency, immutable records, current source permissions, leases, cancellation, stale inputs, usage reservations, cache and narration access          |
| Playwright browser tests          | 11 passed | Core learning journey, review, recovery, mobile layout, automated accessibility, live-feature states, and audio controls                                                        |
| Actual-provider browser rehearsal | Completed | Real Qloo identity resolution and discovery, real source-grounded AI planning/coaching, local playback, fixed practice and durable review                                       |

The final browser suite passed all eleven tests in one complete run. An earlier contrast issue in inactive passage numbers was corrected before that run. A clean production build with `DATABASE_URL` explicitly empty also passed: database queries start at a request-time boundary, and build systems receive no database credential. Hosted CI will be recorded separately.

Database tests use the separate `immersion_test` database. Browser tests use independent guest cookies against the actual application and PostgreSQL. Tests for provider-dependent UI states explicitly intercept those endpoints with labelled fixtures; they neither establish provider availability nor spend provider credits. The real-provider rehearsal is recorded separately in [live observations](LIVE-OBSERVATIONS.md).

## Material boundaries exercised

- A guest cannot read another guest's sessions, runs, coaching, or narration. Cross-site mutations, invalid content types, oversized input, invalid identifiers, unassigned questions, stale versions, and altered source records are rejected.
- Source and assessment records are checked before use. Withdrawn hosting/transcript permission blocks source delivery, exercise access, review, and narration, including retries. Withdrawing only model-processing permission blocks new AI processing while preserving access to an already generated narration where hosting and transcript permissions still apply.
- A hard self-report explicitly requests extra support and holds the next challenge, even after three perfect comprehension sessions. Fixed scores, working bands, and taste are unchanged. Historical adaptation records remain unchanged.
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

## Hosted release

Cloud deployment and independent hosted acceptance are pending at this document revision. No local result above is presented as a hosted result.
