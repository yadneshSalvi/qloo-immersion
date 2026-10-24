# Verification scope

The tested story is: an adult creates a browser-scoped path, selects an original Spanish sample, reads its source, saves a contextual word, completes source-bound questions and a bounded language exercise, gives separate feedback, receives a deterministic adaptation, recalls a due word, and returns to the same durable state.

Local verification on **24 October 2026** used Node 22.22.3, pnpm 10.15.0, Next.js 16.4.3, Playwright 1.64.1, and real PostgreSQL. TypeScript, ESLint, and the production build passed. **14 domain/corpus tests, 14 PostgreSQL integration tests, and all 4 Playwright tests passed.** The final browser run targeted the production server, not a mocked API. Fresh desktop and mobile screenshots were visually inspected. These are results for this local milestone, not a promise about future changes.

- Database tests use a real PostgreSQL **immersion_test** database, separate from the application database.
- Browser tests use Chromium against the actual Next.js server and PostgreSQL-backed routes, with independent cookies.
- The network-recovery test deliberately aborts a save, reloads, and retries its original idempotency key.
- Speech-unavailable testing forces an empty browser voice list; it validates the honest text fallback, not a working platform speech service.
- Automated WCAG-tagged checks run on the entry, setup, collection, evidence, lesson, glossary dialog, review, path, and settings pages. Keyboard testing includes Enter to open a contextual meaning and Escape to return focus. Manual VoiceOver/NVDA validation remains outstanding.
- The 320px checks inspect actual page scroll width across home, discovery, review, path, settings, and evidence. Screenshots are captured at desktop and 390px mobile sizes for human visual inspection.
- Browser result fixtures are not research participants. Source-question scores are not certified language levels; immediate word recall is not a measured long-term retention gain.

The current sample contains no connected Qloo/model worker. API/provider integration, authentic live affinity, external content coverage, speech scoring, teaching quality, and public deployment are outside these test claims.


An isolated adapter preparation check on **24 October 2026** passed `pnpm typecheck`, `pnpm lint`, `pnpm build`, and `pnpm test` (**26 tests: 14 domain/corpus and 12 Qloo boundary tests**). This check did not rerun database or browser journeys and changed no UI behavior. The adapter pins official harness 0.1.26 and MCP SDK 1.32.2. Boundary tests cover candidate-only projection, all six official statuses, malformed responses, suppression of provider prose/learner references, one-to-ten unique UUID validation, all nine entity option types, explicit-key gating, pre-aborted cancellation, invalid timeout/endpoint rejection, and the subprocess environment allowlist.

`pnpm qloo:probe` ran the installed harness locally with an empty credential environment. It returned `ready: false`, `liveCallMade: false`, contract version `1.0.0`, checksum `sha256:762bdcc5e14ff797b6de739d2658a83f78af35e68d7a5a3449455be6046924f5`, and ten advertised tools including `qloo_rank`. This establishes local MCP startup/capability inspection only. Authentication, a live rank response, in-flight timeout/cancellation behavior, shared quota limiting, durable worker integration, and reviewed catalog mappings remain unverified or unimplemented.
