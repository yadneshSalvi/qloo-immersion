# IMMERSION on Google Cloud

Run these scripts from the `immersion` directory. Select the authorized account explicitly with `IMMERSION_GCP_ACCOUNT`, and set `GCLOUD_BIN` and `CLOUDSDK_CONFIG` to an isolated CLI installation/configuration when necessary. `IMMERSION_GCLOUD_WRAPPER` can instead name an absolute path to a private account/project wrapper.

The deployment uses project `immersion-learn-20261027`, region `us-central1`, private VPC `immersion-private`, subnet `immersion-run`, private Cloud SQL PostgreSQL instance `immersion-db`, database `immersion`, Artifact Registry repository `immersion-images`, and Cloud Tasks queue `immersion-research`. The SQL instance uses its own Google managed internal CA. The application verifies that exact CA; it never disables certificate verification.

Create separate SQL administration/migration and runtime users. Store their connection strings separately in Secret Manager as `immersion-migration-database-url` and `immersion-database-url`; store the exact instance CA as `immersion-sql-ca`. Grant migration credentials only to `immersion-migrator`. Grant runtime credentials and CA to web and worker; the migrator also needs CA access. Runtime role `immersion_app` receives CRUD on the fifteen explicitly listed state tables and SELECT on the catalog. It receives no schema, administrative, migration-ledger, or database-creation rights.

Only `immersion-worker` can access `immersion-qloo-api-key`, `immersion-openai-api-key`, and `immersion-cultural-bridges`. The last secret contains the reviewed strict cultural-bridge array and mounts as a file. Provider credentials and reviewed canonical IDs must never enter source, images, build contexts, logs, or web environment variables.

After local tests and the actual-provider flow are approved for release:

1. Set `IMMERSION_IMAGE` to a unique release tag in `us-central1-docker.pkg.dev/immersion-learn-20261027/immersion-images/app` and run `./deploy/gcp/build.sh`. Resolve the resulting digest and use the immutable digest for subsequent steps.
2. Set numeric `IMMERSION_MIGRATION_SECRET_VERSION`, `IMMERSION_DB_SECRET_VERSION`, and `IMMERSION_CA_SECRET_VERSION`. Run `migrate.sh`, `grant-runtime.sh`, and `verify-runtime.sh`. Verification includes trusted private TLS, rejection of an unrelated CA, and runtime privilege checks.
3. Set numeric `IMMERSION_QLOO_SECRET_VERSION`, `IMMERSION_OPENAI_SECRET_VERSION`, and `IMMERSION_BRIDGES_SECRET_VERSION`. Run `deploy.sh`.
4. Check the web health route and an authenticated worker health request, verify unauthenticated worker requests fail, and perform a browser acceptance pass with the released service.

`deploy.sh` applies the capability-URL logging exclusion before public traffic. The private worker has one concurrent request, zero minimum instances, and one maximum instance. It accepts only the invoker service account through Cloud Run IAM. The public web service has one minimum instance and two maximum instances and enqueues jobs with an OIDC identity; it holds no provider keys. Recovery scheduling dispatches at most one queued job per minute. Queue concurrency and dispatch rate are one, with three attempts.

Infrastructure and provider usage are billed separately; provider usage is bounded by the configured daily and guest limits. Delete or scale down resources explicitly when a demo ends; SQL deletion protection requires a deliberate separate change. Never run provider calls merely as deployment probes.
