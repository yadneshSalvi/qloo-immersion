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

`deploy.sh` applies the capability-URL logging exclusion before public traffic. The private worker has one concurrent request, zero minimum instances, and one maximum instance. It accepts only the invoker service account through Cloud Run IAM. The public web service defaults to zero minimum instances and two maximum instances and enqueues jobs with an OIDC identity; it holds no provider keys. Recovery scheduling dispatches at most one queued job per minute. Queue concurrency and dispatch rate are one, with three attempts.

The deployment script sets both service-level and revision-level minimum instances to zero for web and worker and retains request-based CPU billing. After idle instances are removed, the next visit or worker request can incur a cold start. On 28 October 2026, the live web service minimum was changed to zero without
changing its application revision, revision specification, or traffic assignment.
The deployment script preserves this setting for future releases.

Scale-to-zero removes the configured warm-instance baseline, not all costs. Provisioned Cloud SQL compute, database storage, and retained backups continue to incur charges. Active Cloud Run requests (including recovery requests), Tasks, Scheduler, Secret Manager, builds, artifact/media storage, logs, and network traffic add usage charges; provider API billing is separate. Actual charges depend on usage, retention, applicable free tiers and discounts. Provider usage is bounded by the configured daily and guest limits; these limits and maximum instances are not a hard spending cap. See [Cloud Run pricing](https://cloud.google.com/run/pricing) and [Cloud SQL pricing](https://cloud.google.com/sql/pricing). Delete or scale down resources explicitly when a demo ends; SQL deletion protection requires a deliberate separate change. Never run provider calls merely as deployment probes.

Pricing examples checked 28 October 2026, conditional on the stated sizing rather
than a verified live configuration or current bill: at 730 hours, a warm 1-vCPU,
512-MiB web instance costs about US$9.86/month at idle CPU and memory rates of
US$0.0000025 per vCPU-second and GiB-second respectively, before shared free tiers
and discounts. Minimum zero removes that warm-instance baseline, not all charges.
An Iowa non-HA `db-f1-micro` at US$0.0105/hour plus 10 GiB SSD at
US$0.000232877/GiB-hour costs about US$9.37/month for compute and disk
(`730 × 0.0105 + 10 × 730 × 0.000232877`), excluding backups, other services,
provider usage, tax and discounts. See [Cloud Run rates](https://cloud.google.com/run/pricing)
and [Cloud SQL rates](https://cloud.google.com/sql/pricing).
