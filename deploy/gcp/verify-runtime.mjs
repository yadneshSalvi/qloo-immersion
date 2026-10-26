import { database, closeDatabase } from '../../src/server/db.ts';
import { stateTables, catalogTables } from './runtime-tables.mjs';
import { rootCertificates } from 'node:tls';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
const pool = database();
const trustErrors = new Set(['UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY']);
if (process.argv.includes('--negative-ca')) {
  try { await pool.query('SELECT 1'); process.exitCode = 1; }
  catch (error) { process.exitCode = trustErrors.has(error?.code) ? 0 : 1; }
  finally { await closeDatabase(); }
} else {
  let folder;
  try {
    await pool.query('SELECT 1');
    const roles = (await pool.query('SELECT rolcreatedb,rolcreaterole,rolsuper FROM pg_roles WHERE rolname=current_user')).rows[0];
    const rights = (await pool.query("SELECT pg_has_role(current_user,'cloudsqlsuperuser','MEMBER') AS elevated,has_schema_privilege(current_user,'public','CREATE') AS ddl")).rows[0];
    if (!roles || roles.rolcreatedb || roles.rolcreaterole || roles.rolsuper || rights.elevated || rights.ddl) throw Error('Runtime role is elevated.');
    for (const table of stateTables) {
      const access = (await pool.query("SELECT bool_and(has_table_privilege(current_user,$1,permission)) AS crud FROM unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE']::text[]) AS rights(permission)", [`public.${table}`])).rows[0];
      if (!access.crud) throw Error('Missing state-table access.');
    }
    for (const table of catalogTables) {
      const access = (await pool.query("SELECT has_table_privilege(current_user,$1,'SELECT') AS readable, bool_or(has_table_privilege(current_user,$1,permission)) AS writable FROM unnest(ARRAY['INSERT','UPDATE','DELETE','TRUNCATE']::text[]) AS rights(permission)", [`public.${table}`])).rows[0];
      if (!access.readable || access.writable) throw Error('Runtime catalog access is not read-only.');
    }
    const unexpected = (await pool.query(`SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relkind IN ('r','p') AND NOT (c.relname=ANY($1::text[]))
      AND (has_table_privilege(current_user,c.oid,'SELECT') OR has_table_privilege(current_user,c.oid,'INSERT')
      OR has_table_privilege(current_user,c.oid,'UPDATE') OR has_table_privilege(current_user,c.oid,'DELETE'))`,
      [[...stateTables, ...catalogTables]])).rows;
    if (unexpected.length) throw Error('Runtime has access outside the explicit table allowlist.');
    folder = await mkdtemp(join(tmpdir(), 'immersion-ca-negative-'));
    const wrongCa = join(folder, 'unrelated-ca.pem');
    await writeFile(wrongCa, rootCertificates[0], { mode: 0o600 });
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, ['--import', 'tsx', 'deploy/gcp/verify-runtime.mjs', '--negative-ca'], {
        env: { ...process.env, DATABASE_SSL_CA_FILE: wrongCa }, stdio: 'ignore', timeout: 15000,
      });
      child.once('error', reject); child.once('close', resolve);
    });
    if (code !== 0) throw Error('Wrong-CA rejection was not verified.');
    console.log(`IMMERSION runtime smoke passed: trusted private TLS, wrong CA rejected, ${stateTables.length} state-table grants, read-only catalog and no administrative/schema rights.`);
  } catch (error) {
    console.error('IMMERSION runtime smoke failed.', { code: /^[A-Z0-9_]{5,60}$/.test(String(error?.code)) ? error.code : 'CHECK_FAILED' });
    process.exitCode = 1;
  } finally { await closeDatabase(); if (folder) await rm(folder, { recursive: true, force: true }); }
}
