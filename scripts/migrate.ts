import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { corpus } from '../src/content/corpus';
import { transaction, closeDatabase } from '../src/server/db';

export async function migrate() {
  const sql = await readFile(new URL('../migrations/001_core.sql', import.meta.url), 'utf8');
  const correction = await readFile(
    new URL('../migrations/002_source_grounding.sql', import.meta.url),
    'utf8',
  );
  await transaction(async (client) => {
    await client.query('SELECT pg_advisory_xact_lock(7218803)');
    await client.query(sql);
    await client.query(correction);
    for (const { source, assessments } of corpus) {
      const sourceJson = JSON.stringify(source);
      const hash = createHash('sha256').update(sourceJson).digest('hex');
      const existing = await client.query<{ source_hash: string }>(
        'SELECT source_hash FROM content_versions WHERE id=$1',
        [source.versionId],
      );
      if (existing.rows[0] && existing.rows[0].source_hash !== hash)
        throw new Error(
          `Published version ${source.versionId} is immutable. Introduce a new version instead of changing its source.`,
        );
      await client.query(
        `INSERT INTO content_versions(id,slug,source,source_hash,state,can_host,can_transcript,can_adapt,can_model,license,educator_review)
        VALUES($1,$2,$3,$4,'released',true,true,true,false,'CC0-1.0','pending') ON CONFLICT(id) DO NOTHING`,
        [source.versionId, source.id, sourceJson, hash],
      );
      for (const item of assessments) {
        const { answer, explanation, ...publicItem } = item;
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
