# IMMERSION

**Follow your curiosity. Find your Spanish.**

IMMERSION is a cultural reading and listening studio for English-speaking adults learning Spanish around A2–B1. The interface combines an editorial collection, a quiet reading canvas, source-specific practice, and a personal word notebook.

This repository contains a working **authored sample edition**. Its complete local journey uses real PostgreSQL persistence. It does not make live Qloo or model requests, and adding a provider key alone does not enable those features.

## Run locally

Requires Node **22.22.3**, pnpm **10.15.0**, and PostgreSQL (tested against the task’s local PostgreSQL service). A Docker Compose option is included for a new local database.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set `POSTGRES_PASSWORD` and the password in `DATABASE_URL` to the same local development value. Keep `.env.local` private. If you already have PostgreSQL, set `DATABASE_URL` to its **immersion** database and skip the Docker command. The database must exist before migration.

```sh
# For a new database; skip if an existing service already occupies port 55432.
docker compose --env-file .env.local up -d db

# Wait for PostgreSQL to be healthy, then initialize tables and the sample collection.
pnpm db:migrate
pnpm dev
```

Open [http://127.0.0.1:3103](http://127.0.0.1:3103). Keep `APP_ORIGIN` equal to the browser origin; mutations require a same-origin JSON request. Development and production startup both bind to `127.0.0.1:3103` by default.

For a local production build:

```sh
pnpm build
pnpm start
```

Stop the development server before starting the production server on the same port. The app is not a static export: it requires a Node runtime, a persistent PostgreSQL connection, and migrations. No public deployment is asserted by this repository.

## Try the complete journey

1. Choose **Build my path**, confirm that you are 18 or older, choose reading/listening starting bands, and select at least one cultural category. Named favorites are optional, expressed references; they are not resolved Qloo entities.
2. With A2 and **Food culture**, open **Una mesa en el mercado**. Start with support or begin independently.
3. Read its three passages, open a contextual word meaning, and save a word. English translation and an optional browser-generated Spanish voice are available. If the browser has no Spanish voice, the text remains usable.
4. Answer three source questions and try a short missing-word exercise. Answer keys stay on the server. Corrections point back to the assigned passage. The three comprehension answers are scored once; the separate expression exercise permits up to three attempts.
5. Give separate taste and difficulty feedback. An optional Spanish reflection is saved when the session is completed and is explicitly unscored. You choose whether to use feedback to adapt the path.
6. Open **My words**, recall the saved expression, and see its real next review time. Review again after its due date. Reloading preserves your session, responses, saved words, and schedule.
7. Visit **My path** and **Sample edition** to inspect actual activity and adaptation evidence. Preferences and data controls are in **Settings**; export or delete only your own guest path.

A positive cultural preference with low objective comprehension retains the thread and adds support. A negative preference with good comprehension keeps the challenge and changes culture. With this small corpus, preserving a thread may mean a clearly explained supported revisit; it is not presented as a new unseen recommendation. No single session automatically changes the self-selected reading/listening bands. Self-reported difficulty is recorded separately from objective answers.

## What is implemented

- Twelve original fictional Spanish pieces: music, cinema, literature, food, design, and everyday places, each with an intended A2 and B1 band. Six reading-first and six reading/listening pieces, with three passages and three vocabulary items each.
- Forty-eight bounded exercises: three source questions and one short expression exercise per piece. Exact source version, session, and objective assignments are validated by services and composite PostgreSQL foreign keys.
- Three editorial discovery routes, category/search/format/band/duration filters, source previews, saved pieces, optional translations, browser speech, desktop contextual meanings, and a mobile glossary sheet with keyboard focus return.
- Isolated 30-day guest cookies whose bearer values are stored only as hashes in PostgreSQL. Owner-scoped reads and writes, strict typed commands, same-origin checks, transactional owner locks, optimistic versions, and idempotency keys.
- Actual source permission checks on source delivery, practice, vocabulary, exports, and keyed replays. Withdrawal blocks source details while keeping activity metadata. A keyed session retry returns the current session instead of reverting the UI to an old snapshot.
- First word recall is due immediately after saving. Successful recall schedules the next interval at **1 / 3 / 7 / 14 days**; failed recall resets to one day. The server enforces due times. This explicit policy is not a claim of optimal retention.
- Browser-local pending-save recovery. If a request is interrupted, the same keyed request can be retried after reloading. A different action cannot silently replace an unresolved pending save. No audio is recorded or queued.
- Personal JSON export and guest deletion with database cascades. Exports omit credentials, future answer keys, source passages, and text details associated with unavailable sources.

## Architecture and boundaries

This initial implementation uses a single Next.js App Router application with focused modules, rather than an unneeded distributed agent runtime for its deterministic sample path.

| Location                 | Responsibility                                                                                 |
| ------------------------ | ---------------------------------------------------------------------------------------------- |
| `src/app/`               | Server-rendered routes and JSON handlers                                                       |
| `src/components/`        | Reading, speech, practice, glossary, feedback, and review interactions                         |
| `src/domain/learning.ts` | Separate taste/comprehension adaptation, per-use rights, assignment binding, review scheduling |
| `src/domain/commands.ts` | Strict Zod schemas, finite inputs, stable domain errors, bounded answer normalization          |
| `src/content/corpus.ts`  | Original sample sources and server-only answer-key data; keys are never passed to clients      |
| `src/server/store.ts`    | PostgreSQL reads and transactional commands; all learner access is owner-scoped                |
| `migrations/`            | Schema, constraints, and the sample wording correction                                         |
| `tests/`                 | Domain/corpus tests, isolated PostgreSQL invariants, and real-browser journeys                 |

`POST /api/guest` creates an adult-confirmed guest. `POST /api/commands` accepts a UUID idempotency key and one validated command. `/api/profile/export` exports only the current guest; `DELETE /api/profile` requires the explicit deletion confirmation used by the dialog. `/api/health` checks database connectivity and states which providers are not enabled without exposing configuration values.

A guest cookie is an access credential, not a production account system. Clearing it or letting it expire loses access to the guest space; cookie expiry alone does not delete its database records. Export or delete the path first. There is no cross-device recovery, automated retention cleanup, external analytics, recording upload, or model processing in this edition. Tenant isolation is enforced in application queries and tested; PostgreSQL row-level policies are not implemented.

Published **source seed snapshots** have hashes that make migration refuse changed source text under the same identity. This is not a complete editorial versioning platform. Migration 002 corrects an unreleased sample question/explanation in place while preserving its answer and score: it asks what the woman is preparing, exactly as passage 1 states. Historical assessment prompts are not immutably replayable yet. Production assessment edits and source publishing need new versioned identities and an editorial release workflow.

## Tests and local verification

Create a separate database named **immersion_test** on the same PostgreSQL server. The integration test file explicitly redirects the connection to that database and never truncates the application database.

```sh
# If using the included Compose service:
docker compose --env-file .env.local exec db createdb -U immersion immersion_test

pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm exec playwright install chromium

# With the web application already running at http://127.0.0.1:3103:
pnpm test:e2e
pnpm build
```

The browser tests create isolated guests in the running app database. The full desktop test deletes its own guest; other browser fixtures may remain and can be reset from that guest’s Settings or by resetting a disposable local database. Do not run these tests against a real learner deployment.

The 24 October 2026 local production check passed typecheck, lint, build, **14 domain/corpus tests, 14 PostgreSQL tests, and 4 Playwright tests**. See [verification scope](docs/VERIFICATION.md) for what those checks establish.

The tests cover source-grounded question assignment, age validation, ownership, concurrent/stale requests, duplicate results, adaptation consent, review timing, deletion, unavailable sources, and a cached review retry after revocation. Browser journeys cover onboarding, reload, complete practice, independent feedback, recall, export/deletion, network retry, speech-unavailable text fallback, and 320px overflow checks. Automated WCAG checks and keyboard glossary focus tests are included. Screenshots and traces are local ignored artifacts. Automated accessibility checks do not replace a real screen-reader audit or certify WCAG compliance.

## Live Qloo / model work that remains

There is **no connected official Qloo adapter or durable provider worker in this sample milestone**. The UI and health endpoint deliberately say live discovery and model feedback are unavailable. `QLOO_API_KEY` is a reserved server-side configuration placeholder. These steps are required before enabling live features:

1. Install and capability-test the pinned official Qloo harness in a persistent worker, including authentication, error envelopes, quotas, tool contracts, and bounded timeouts. Harness readiness alone is not a successful authenticated discovery call.
2. Implement explicit entity disambiguation and user confirmation. Create independently reviewed mappings from approved content to real Qloo entities, preserving what the relationship means. No sample piece currently claims such a mapping.
3. Retrieve or rank a deterministic eligible shortlist under the harness’s verified contract. The inspected 0.1.26 contract permits at most ten signals/options per ranking call and workflow outputs of at most twenty. Reverify these limits against the actual pinned runtime; do not merge normalized scores across incomparable batches or call them enjoyment probabilities.
4. Add durable run leasing, a shared credential-level quota limiter, bounded retries, cancellation, sanitized provider provenance, outage states, and an equivalent editorial baseline. The existing local activity log is a deterministic application trace, not a model-agent or Qloo tool trace.
5. Choose and verify an actual model provider. Add bounded source-grounded generation and independently reviewed teaching output; never turn free writing into an invented score. Speech assessment would separately require explicit microphone consent, provider terms, uncertainty handling, and recording deletion controls.
6. Complete educator review, factual/context checks, per-use third-party rights acquisition where needed, accessible media coverage, and an authorized editorial publishing/withdrawal interface. The sample currently has no watch/video format, licensed third-party creator corpus, educator-reviewed collection, or production accounts.
7. Establish consented usability/relevance/learning evaluation, production hosting, managed secrets, backup/restore verification, rate limits, and operating procedures before a public release. No research result, measured learning gain, API entitlement, certified CEFR result, or public deployment is claimed here.

## Licensing and attribution

Application code and original code-generated artwork are MIT licensed. Original sample writing is dedicated under CC0 to the extent rights exist; see [CONTENT_LICENSE.md](CONTENT_LICENSE.md). No third-party cultural media is included, and no license here grants rights to Qloo data or third-party works.

Fraunces (Undercase Type) and Source Sans 3 (Adobe) are self-hosted from pinned font packages, with SIL Open Font License notices in [`docs/licenses/`](docs/licenses/). Browser speech uses voices supplied by the learner’s browser/operating system, which may use an online voice service. It is labeled synthetic browser output and does not impersonate a creator.
