import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { corpus } from '../src/content/corpus';
import { transaction, closeDatabase } from '../src/server/db';
import { sourceIntegrityHash } from '../src/server/integrity';

export async function migrate() {
  const sql = await readFile(new URL('../migrations/001_core.sql', import.meta.url), 'utf8');
  const correction = await readFile(
    new URL('../migrations/002_source_grounding.sql', import.meta.url),
    'utf8',
  );
  const live = await readFile(
    new URL('../migrations/003_live_learning.sql', import.meta.url),
    'utf8',
  );
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(7218803)');
    await client.query(sql);
    const applied = await client.query<{ version: number }>(
      'SELECT version FROM schema_migrations',
    );
    if (!applied.rows.some((row) => row.version === 2)) await client.query(correction);
    if (!applied.rows.some((row) => row.version === 3)) await client.query(live);
    for (const { source, assessments } of corpus) {
      const sourceJson = JSON.stringify(source);
      const hash = createHash('sha256').update(sourceJson).digest('hex');
      const existing = await client.query<{ source_hash: string; identical: boolean }>(
        'SELECT source_hash,source=$2::jsonb AS identical FROM content_versions WHERE id=$1',
        [source.versionId, sourceJson],
      );
      if (
        existing.rows[0] &&
        (existing.rows[0].source_hash !== hash || !existing.rows[0].identical)
      )
        throw new Error(
          `Published version ${source.versionId} is immutable. Introduce a new version instead of changing its source.`,
        );
      await client.query(
        `INSERT INTO content_versions(id,slug,source,source_hash,state,can_host,can_transcript,can_adapt,can_model,license,educator_review)
        VALUES($1,$2,$3,$4,'released',true,true,true,true,'CC0-1.0','pending') ON CONFLICT(id) DO NOTHING`,
        [source.versionId, source.id, sourceJson, hash],
      );
      await client.query(
        'UPDATE content_versions SET source_integrity_hash=$2 WHERE id=$1 AND source_integrity_hash IS NULL',
        [source.versionId, sourceIntegrityHash(source)],
      );
      for (const item of assessments) {
        const { answer, explanation, ...publicItem } = item;
        const existingItem = await client.query<{ unchanged: boolean }>(
          `SELECT content_version_id=$2 AND objective_id=$3 AND kind=$4 AND public_item=$5::jsonb AND answer_key=$6::jsonb AS unchanged FROM assessment_items WHERE id=$1`,
          [
            item.id,
            source.versionId,
            item.objectiveId,
            item.kind,
            JSON.stringify(publicItem),
            JSON.stringify({ answer, explanation }),
          ],
        );
        if (existingItem.rows[0] && !existingItem.rows[0].unchanged)
          throw new Error(
            `Published assessment ${item.id} is immutable. Introduce a new version instead.`,
          );
        await client.query(
          `INSERT INTO assessment_items(id,content_version_id,objective_id,kind,public_item,answer_key)
          VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO NOTHING`,
          [
            item.id,
            source.versionId,
            item.objectiveId,
            item.kind,
            JSON.stringify(publicItem),
            JSON.stringify({ answer, explanation }),
          ],
        );
      }
    }
  });
}
if (process.argv[1]?.endsWith('migrate.ts')) {
  migrate()
    .then(() =>
      console.log(
        `Migrated PostgreSQL; ${corpus.length} immutable authored sample pieces available.`,
      ),
    )
    .finally(closeDatabase);
}
