#!/usr/bin/env -S node --no-warnings
// Argos-studio — consistent copy of the library while the server runs (SQLite VACUUM INTO).
//
//   docker exec <conteneur> argos-backup [répertoire]   # défaut : /data/backups
//
// Prints the path of the copy: a complete SQLite database, readable alone. Restore it by
// putting it in place of /data/argos.db while the container is stopped.
// CommonJS on purpose: the file is installed without extension as /usr/local/bin/argos-backup.
const { mkdirSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { DatabaseSync } = require('node:sqlite');

process.umask(0o077);
const url = process.env.DATABASE_URL ?? '';
if (!url.startsWith('file:/')) {
  console.error('[argos] DATABASE_URL doit désigner un fichier SQLite absolu.');
  process.exit(64);
}
const source = url.slice('file:'.length).split('?')[0];
const directory = process.argv[2] ?? join(dirname(source), 'backups');
mkdirSync(directory, { recursive: true });
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
const target = join(directory, `argos-${stamp}.db`);
const database = new DatabaseSync(source, { readOnly: true });
try {
  // One read transaction: the copy is a snapshot, even while admissions continue.
  database.exec(`VACUUM INTO '${target.replaceAll("'", "''")}'`);
} finally {
  database.close();
}
console.log(target);
