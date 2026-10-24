CREATE TABLE IF NOT EXISTS schema_migrations (version integer PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS learners (
  id uuid PRIMARY KEY, token_hash text NOT NULL UNIQUE, age_confirmed_at timestamptz NOT NULL,
  profile jsonb NOT NULL CHECK (jsonb_typeof(profile) = 'object'), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS content_versions (
  id text PRIMARY KEY, slug text NOT NULL UNIQUE, source jsonb NOT NULL CHECK (jsonb_typeof(source) = 'object'),
  source_hash text NOT NULL, state text NOT NULL CHECK (state IN ('released', 'withdrawn')),
  revoked_at timestamptz, expires_at timestamptz, can_host boolean NOT NULL, can_transcript boolean NOT NULL,
  can_adapt boolean NOT NULL, can_model boolean NOT NULL, license text NOT NULL,
  educator_review text NOT NULL CHECK (educator_review = 'pending'), created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS assessment_items (
  id text PRIMARY KEY, content_version_id text NOT NULL REFERENCES content_versions(id), objective_id text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('comprehension','practice')), public_item jsonb NOT NULL, answer_key jsonb NOT NULL,
  UNIQUE(id, content_version_id, objective_id)
);
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY, learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  content_version_id text NOT NULL REFERENCES content_versions(id), state text NOT NULL DEFAULT 'active' CHECK (state IN ('active','practice','completed')),
  position integer NOT NULL DEFAULT 0 CHECK (position >= 0), support text NOT NULL CHECK (support IN ('independent','guided','extra')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), feedback jsonb, note text NOT NULL DEFAULT '',
  started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz,
  UNIQUE(id, content_version_id), CHECK ((state = 'completed') = (completed_at IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_piece ON sessions(learner_id, content_version_id) WHERE state <> 'completed';
CREATE INDEX IF NOT EXISTS sessions_learner ON sessions(learner_id, started_at DESC);
CREATE TABLE IF NOT EXISTS session_assessments (
  session_id uuid NOT NULL, assessment_id text NOT NULL, content_version_id text NOT NULL, objective_id text NOT NULL,
  PRIMARY KEY(session_id, assessment_id),
  FOREIGN KEY(session_id, content_version_id) REFERENCES sessions(id, content_version_id) ON DELETE CASCADE,
  FOREIGN KEY(assessment_id, content_version_id, objective_id) REFERENCES assessment_items(id, content_version_id, objective_id)
);
CREATE TABLE IF NOT EXISTS responses (
  session_id uuid NOT NULL, assessment_id text NOT NULL, answer text NOT NULL, correct boolean NOT NULL,
  feedback text NOT NULL, source_quote text NOT NULL, attempts integer NOT NULL DEFAULT 1 CHECK (attempts BETWEEN 1 AND 3),
  scorer_version text NOT NULL DEFAULT 'bounded-answer-1', created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(session_id, assessment_id),
  FOREIGN KEY(session_id, assessment_id) REFERENCES session_assessments(session_id, assessment_id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS review_items (
  id uuid PRIMARY KEY, learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  content_version_id text NOT NULL REFERENCES content_versions(id), term_id text NOT NULL,
  stage integer NOT NULL DEFAULT 0 CHECK(stage BETWEEN 0 AND 4), version integer NOT NULL DEFAULT 1,
  due_at timestamptz NOT NULL DEFAULT now(), last_result boolean, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id, content_version_id, term_id)
);
CREATE INDEX IF NOT EXISTS reviews_learner ON review_items(learner_id, due_at);
CREATE TABLE IF NOT EXISTS review_attempts (
  id uuid PRIMARY KEY, review_id uuid NOT NULL REFERENCES review_items(id) ON DELETE CASCADE,
  correct boolean NOT NULL, stage_before integer NOT NULL, stage_after integer NOT NULL,
  due_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), policy_version text NOT NULL
);
CREATE TABLE IF NOT EXISTS bookmarks (
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  content_version_id text NOT NULL REFERENCES content_versions(id), created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY(learner_id, content_version_id)
);
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY, learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  kind text NOT NULL, summary text NOT NULL, detail jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS events_learner ON events(learner_id, created_at DESC);
CREATE TABLE IF NOT EXISTS idempotency (
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE, key uuid NOT NULL, request_hash text NOT NULL,
  response jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(learner_id, key)
);
INSERT INTO schema_migrations(version) VALUES(1) ON CONFLICT DO NOTHING;
