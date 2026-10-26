ALTER TABLE content_versions ADD COLUMN IF NOT EXISTS source_integrity_hash text;
CREATE TABLE IF NOT EXISTS learning_runs (
  id uuid PRIMARY KEY, learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK(kind IN ('resolution','discovery','coaching')),
  state text NOT NULL DEFAULT 'queued' CHECK(state IN ('queued','running','succeeded','failed','cancelled')),
  stage text NOT NULL DEFAULT 'Waiting for the worker',
  idempotency_key uuid NOT NULL, request_hash text NOT NULL,
  profile_version integer NOT NULL,
  session_id uuid REFERENCES sessions(id) ON DELETE CASCADE,
  content_version_id text REFERENCES content_versions(id),
  payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
  snapshot jsonb NOT NULL CHECK(jsonb_typeof(snapshot)='object'),
  checkpoints jsonb NOT NULL DEFAULT '{}'::jsonb CHECK(jsonb_typeof(checkpoints)='object'),
  result jsonb, error jsonb,
  trace jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(trace)='array'),
  attempts integer NOT NULL DEFAULT 0 CHECK(attempts BETWEEN 0 AND 3),
  lease_token uuid, lease_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(learner_id,idempotency_key),
  CHECK((state='running') = (lease_token IS NOT NULL AND lease_until IS NOT NULL)),
  CHECK((kind='coaching') = (session_id IS NOT NULL AND content_version_id IS NOT NULL)),
  CHECK((state='succeeded') = (result IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS learning_runs_claim ON learning_runs(state,lease_until,created_at);
CREATE INDEX IF NOT EXISTS learning_runs_owner ON learning_runs(learner_id,kind,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS one_active_learning_run ON learning_runs(learner_id) WHERE state IN ('queued','running');
CREATE TABLE IF NOT EXISTS taste_signals (
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  entity_id uuid NOT NULL,
  candidate jsonb NOT NULL CHECK(jsonb_typeof(candidate)='object'),
  resolution_run_id uuid NOT NULL REFERENCES learning_runs(id) ON DELETE CASCADE,
  confirmed_at timestamptz NOT NULL DEFAULT now(), evidence_at timestamptz NOT NULL,
  PRIMARY KEY(learner_id,entity_id)
);
CREATE TABLE IF NOT EXISTS live_idempotency (
  learner_id uuid NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  key uuid NOT NULL, request_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY(learner_id,key)
);
CREATE TABLE IF NOT EXISTS provider_call_reservations (
  id uuid PRIMARY KEY, run_id uuid REFERENCES learning_runs(id) ON DELETE SET NULL,
  principal_hash text NOT NULL, credential_scope text NOT NULL,
  provider text NOT NULL CHECK(provider IN ('qloo','model')),
  step text NOT NULL, reserved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(run_id,provider,step)
);
CREATE INDEX IF NOT EXISTS provider_budget ON provider_call_reservations(credential_scope,provider,reserved_at);
CREATE TABLE IF NOT EXISTS provider_result_cache (
  key text PRIMARY KEY, data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS worker_heartbeat (
  id integer PRIMARY KEY CHECK(id=1), last_seen_at timestamptz NOT NULL,
  last_failure_at timestamptz
);
-- The publisher grants model processing of the original CC0 teaching scenes.
-- This is a permission change, not a source-text revision or educator approval.
UPDATE content_versions SET can_model=true WHERE license='CC0-1.0' AND source->'provenance'->>'mode'='authored-sample';
INSERT INTO schema_migrations(version) VALUES(3) ON CONFLICT DO NOTHING;
