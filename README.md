# IMMERSION

**Follow your curiosity. Find your Spanish.**

[Try the live application](https://immersion-web-dnp3wctt7a-uc.a.run.app) · [Watch the demo film](https://immersion-demo-dnp3wctt7a-uc.a.run.app) · [Submission story](SUBMISSION.md) · [Verification](docs/VERIFICATION.md)

IMMERSION is a cultural reading and listening studio for English-speaking adults (18+) learning Spanish around **A2–B1 working bands**. Confirm a favorite, follow a cultural connection into an original story, practice its language, and keep useful expressions in a personal word notebook.

The collection contains **36 original fictional Spanish stories written with AI assistance** across music, cinema, literature, food, design, and everyday places: **18 reading pieces and 18 reading/listening pieces**. Educator review is pending. The bands are starting recommendations, not certified CEFR assessments.

Fifteen listening pieces include approved prebuilt synthetic Spanish MP3 narration with passage timing. Three use the clearly labeled browser-voice/text fallback: `una-cancion-dos-versiones`, `el-puesto-que-cambio-la-hora`, and `el-banco-que-se-movia`. Playback is explicit, with speed controls, keyboard scrubbing, passage seeking, and a browser-local saved position. See the [narration notes](assets/audio/README.md).

## Follow a cultural connection

1. **Identify a favorite.** Search for an artist, film, book, person, brand, or place. Choose the exact returned Qloo identity; ambiguous names are never silently confirmed. Keep up to three favorites.
2. **Find a connection.** Qloo ranks a restricted shortlist of reviewed film references against those favorites. IMMERSION connects film themes to its own original Spanish stories. Source permissions, reading/listening band, time, novelty, and explicit support preferences determine eligible story options separately.
3. **Receive a study invitation.** A bounded OpenAI `ToolLoopAgent` first inspects the eligible original corpus, then proposes structured study guidance in at most two model steps. Code validates selected sources, protected route order, and exact source quotations. If AI planning fails, the recorded cultural order and deterministic selection remain clearly labeled.
4. **Explore and practice.** Read three passages, reveal English, open contextual word meanings, and optionally listen. Each story has three fixed source questions and one expression exercise: **144 assigned exercises**. Answer keys remain server-side. Comprehension results and expression practice are separate.
5. **Write an opinion, optionally.** After the fixed exercises, consent separately to send a short typed opinion and story context for AI writing feedback. It returns one useful success, at most two corrections tied to exact learner spans, verified source quotations, a labeled generated example, and a retry invitation. A session permits three feedback requests. This activity does not alter comprehension results or produce a fluency score.
6. **Return to what mattered.** Give separate taste and difficulty feedback, choose whether to adapt the next route, and revisit saved words. Asking for more support opens translations, authored hints, and the source beside practice, while holding the challenge even after strong question results. Saved narration begins at 0.75× unless you have chosen a speed; playback still requires a click. You can close the help or choose to work independently. This does not change your scores, working bands, or taste. Successful recall uses an explicit 1/3/7/14-day schedule; that policy is not evidence of optimal retention.

The discovery comparison uses the same eligible film-reference pool and learner constraints for the editorial baseline and Qloo-informed order. Shared film references use the same selected story in both lists. A changed order is an integration observation, **not measured preference, learning gain, retention, or causal lift**. These stories are not Qloo-indexed lessons, film excerpts, or film adaptations; cultural connections imply no creator affiliation, endorsement, or media rights.

Browse the editorial collection and continue saved lessons when a provider is unavailable. Provider evidence is labeled **live** or **cached**, with its original timestamp. Actual provider observations are recorded separately in [LIVE-OBSERVATIONS](docs/LIVE-OBSERVATIONS.md).

## Run locally

Requires Node **22.22.3**, pnpm **10.15.0**, and PostgreSQL. The included Compose service uses PostgreSQL 17, database/user `immersion`, and loopback port **55432**.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
```

Set `POSTGRES_PASSWORD` and the password in `DATABASE_URL` to the same local value. Keep `APP_ORIGIN=http://127.0.0.1:3103` for the default web server. If an existing PostgreSQL service already provides the database, configure its URL and skip Compose; the database must exist before migration.

```sh
# Optional: start the included local database, then wait for its health check.
docker compose --env-file .env.local up -d db

pnpm db:migrate
pnpm dev
```

Open [http://127.0.0.1:3103](http://127.0.0.1:3103). Onboarding continues to **Your interests**; **Browse the collection** works without provider credentials. With live capabilities disabled, the deterministic learning journey remains available.

For a local production build, stop the development server before using the same port:

```sh
pnpm build
pnpm start
```

This is a Node application with persistent PostgreSQL state, not a static export. Migrations reject changed source or assessment data under published identities. The schema currently allows one content row per unique slug: an authored revision requires distinct source ID/slug, version identity, and assessment IDs. Automated version promotion and simultaneous editions of one slug are not implemented.

## Configure optional live processing

The **web process** needs database access, the appropriate database CA for deployed TLS, `APP_ORIGIN`, and capability/dispatch configuration. The **worker process** needs database access plus provider credentials and the private reviewed film-theme bridge. Keep provider keys and private bridge configuration out of the web environment, browser bundles, build contexts, logs, and repository.

| Process       | Configuration                                                                                                                                                                            |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Web           | `DATABASE_URL`, `APP_ORIGIN`; `DATABASE_SSL_CA_FILE` and `DATABASE_SSL_MODE` for deployed TLS; `LIVE_QLOO_ENABLED=1` / `LIVE_COACHING_ENABLED=1` only for configured worker capabilities |
| Worker        | `DATABASE_URL`, database TLS settings, `QLOO_API_KEY`, `OPENAI_API_KEY`, and `IMMERSION_CULTURAL_BRIDGES_FILE` or `IMMERSION_CULTURAL_BRIDGES_JSON`                                      |
| Provider pins | Qloo uses `https://hackathon.api.qloo.com`; the accepted OpenAI model is `gpt-6.1-sol` (`OPENAI_MODEL` may explicitly select that same value)                                            |
| Budgets       | `QLOO_DAILY_CALL_LIMIT` / `QLOO_GUEST_DAILY_CALL_LIMIT` default to 100 / 15; `MODEL_DAILY_CALL_LIMIT` / `MODEL_GUEST_DAILY_CALL_LIMIT` default to 120 / 12                               |

Limits count reserved provider attempts over a rolling day, not tokens, invoice totals, or remaining account credit. A run permits at most one Qloo request and two model requests. Atomic reservations also enforce a per-credential minute limit. Valid Qloo cache entries and saved checkpoints avoid repeated requests.

Acquire film identifiers through authorized Qloo catalog verification, review ambiguous identities and each editorial theme relationship, and import a private strict array of **3–10 film bridges**. Each entry requires `key`, canonical `entityId`, `entityType: "movie"`, `name`, `cluster`, `theme`, `explanation`, an HTTPS `sourceUrl` without query parameters or embedded credentials, and ISO `verifiedAt`. Keys and identities must be unique. The [configuration validator](src/server/live-config.ts) defines the exact contract. No canonical mapping is bundled as fictional demonstration data; missing identities cannot be invented.

Inject worker secrets into its own process environment or secret mounts. `pnpm worker` runs [`scripts/worker.ts`](scripts/worker.ts) and reads `.env.local` for shared local settings; do not put provider credentials in that file when the web process also reads it. The local worker polls durable PostgreSQL jobs. Optional private dispatch uses `WORKER_URL` and a separate `WORKER_DISPATCH_TOKEN` of at least 32 characters. Cloud Run uses private IAM/OIDC dispatch through Cloud Tasks; follow the [deployment guide](deploy/gcp/README.md).

Starting a configured worker allows it to process explicitly queued live requests. Browsing pages, reading health status, and fetching saved narration do not call paid providers. `pnpm qloo:probe` is a credential-free installed-harness check, not authenticated discovery or a quota probe.

## Guest data and processing

A guest cookie is an access credential with a **30-day browser expiry**; only its hash is stored in PostgreSQL. There are no accounts or cross-device recovery. Clearing or losing the cookie loses access. **Cookie expiry does not delete server data:** guest records remain until the user deletes the path, and there is no automatic guest-retention cleanup.

Qloo receives the explicit cultural search or confirmed-identity ranking request, not written practice. OpenAI receives eligible source context for a requested study invitation, or the typed answer and assigned story context after separate writing consent. Requests set `store: false`; this describes the application request, not a guarantee about external provider retention. No microphone recording or pronunciation assessment is implemented.

Settings provides owner-scoped JSON export and deletion. Exports include permitted learning activity and live results, while omitting credentials, future answer keys, full Spanish source passages, and live source-quote fields. Saved-word reviews include their English passage translation as context while source permissions remain valid. Current source hashes and permissions are rechecked; unavailable-source details are withheld. Deletion removes the guest’s learning records and live runs. Shared provider cache and minimal hashed quota reservations have separate maintenance: cache entries expire after **24 hours**, and worker maintenance purges expired entries and reservations older than **48 hours**. Maintenance depends on the worker running. Browser-tab storage also holds pending-save recovery and narration position.

See [architecture and trust boundaries](docs/ARCHITECTURE.md). This access model provides isolated guest state, not a production account system or a completed retention-management service.

## Tests and deployment

Create a separate **`immersion_test`** database on the same PostgreSQL server. The integration suites redirect `DATABASE_URL` to that database and reset its learner state.

```sh
# With the included Compose database, create this once:
docker compose --env-file .env.local exec db createdb -U immersion immersion_test

pnpm typecheck
pnpm lint
pnpm test
pnpm test:db
pnpm exec playwright install chromium

# With the web app already running on port 3103:
pnpm test:e2e
pnpm build
```

Provider-free tests cover domain boundaries, real PostgreSQL transactions, worker recovery and budgets, source integrity and revocation, guest isolation, browser consent and recovery, mobile overflow, narration controls, and automated accessibility checks. Browser tests create isolated guests in the running app database; use a disposable local instance. Automated checks do not establish educator validation or replace a screen-reader audit.

[VERIFICATION](docs/VERIFICATION.md) owns dated commands, results, and limitations; [LIVE-OBSERVATIONS](docs/LIVE-OBSERVATIONS.md) owns measured provider behavior; and the [Google Cloud deployment guide](deploy/gcp/README.md) owns release operations. Refer to those records for deployment status and observed call counts.

## Licensing

Application code and original code-generated artwork are MIT licensed. Original AI-assisted story text is dedicated under CC0-1.0 to the extent rights exist; narration and content details are in [CONTENT_LICENSE](CONTENT_LICENSE.md). No third-party cultural media is included. These licenses grant no rights to Qloo data or referenced third-party works.

Fraunces by Undercase Type and Source Sans 3 by Adobe are self-hosted under the SIL Open Font License; notices are in [`docs/licenses/`](docs/licenses/). Synthetic narration and browser voices are labeled as such and do not represent a creator’s voice.
