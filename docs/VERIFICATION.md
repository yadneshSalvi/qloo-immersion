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
