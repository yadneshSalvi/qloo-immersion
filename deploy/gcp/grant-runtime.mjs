import { database, closeDatabase } from '../../src/server/db.ts';
import { stateTables, catalogTables } from './runtime-tables.mjs';
const pool = database();
const names = list => list.map(name => `public.${name}`).join(', ');
try {
  await pool.query(`BEGIN;
    REVOKE cloudsqlsuperuser FROM immersion_app;
    ALTER ROLE immersion_app NOCREATEDB NOCREATEROLE;
    REVOKE CREATE ON SCHEMA public FROM PUBLIC;
    REVOKE ALL ON SCHEMA public FROM immersion_app;
    GRANT CONNECT ON DATABASE immersion TO immersion_app;
    GRANT USAGE ON SCHEMA public TO immersion_app;
    REVOKE ALL ON TABLE ${names([...stateTables, ...catalogTables])} FROM immersion_app;
    GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE ${names(stateTables)} TO immersion_app;
    GRANT SELECT ON TABLE ${names(catalogTables)} TO immersion_app;
    COMMIT;`);
  const role = (await pool.query("SELECT rolcreatedb,rolcreaterole,rolsuper FROM pg_roles WHERE rolname='immersion_app'")).rows[0];
  const membership = (await pool.query("SELECT pg_has_role('immersion_app','cloudsqlsuperuser','MEMBER') AS elevated")).rows[0];
  if (!role || role.rolcreatedb || role.rolcreaterole || role.rolsuper || membership.elevated) throw Error('Unexpected runtime role privileges.');
  console.log(`IMMERSION runtime role configured: CRUD on ${stateTables.length} state tables, read-only catalog, no database/role creation or administrative membership.`);
} catch (error) {
  console.error('IMMERSION database privilege configuration failed.', { code: /^[A-Z0-9]{5}$/.test(String(error?.code)) ? error.code : 'UNKNOWN' });
  process.exitCode = 1;
} finally { await closeDatabase(); }
