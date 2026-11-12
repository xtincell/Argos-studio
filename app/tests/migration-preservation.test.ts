import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';

test('native dossier migration preserves existing reference, asset and source records', () => {
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('prisma/migrations/20260512171730_init/migration.sql', 'utf8'));
    db.exec(`INSERT INTO Reference (id,slug,title,brandEmitter,sector,marketPrimary,emissionYear,patternKind,manipulationMode,funnelStage,confidence,summary,performanceComposite,performanceOverallAttribution,ingestPath,updatedAt)
      VALUES ('legacy-receipt','legacy-receipt','Synthetic prior record','Synthetic receipt','test','test',2025,'TEXT','FACILITATOR','CONSIDERATION','LOW','Prior editorial work',55,'ESTIMATED','manual-dossier','2026-01-01T00:00:00.000Z');
      INSERT INTO Asset (id,referenceId,kind,function,role,url,aspectRatio,text) VALUES ('legacy-asset','legacy-receipt','TEXT','HEADLINE','HERO','','16:9','Prior exact text');
      INSERT INTO ResearchSource (id,referenceId,url,title,accessedDate,license,role) VALUES ('legacy-source','legacy-receipt','https://example.test','Prior exact citation','2026-01-01','fair-use','primary');`);
    const before = {
      references: db.prepare('SELECT * FROM Reference').all(),
      assets: db.prepare('SELECT * FROM Asset').all(),
      sources: db.prepare('SELECT * FROM ResearchSource').all(),
    };
    db.exec(readFileSync('prisma/migrations/20261019112000_native_dossier_flow/migration.sql', 'utf8'));
    const migrated = db.prepare('SELECT * FROM Reference').all();
    const migratedReference = migrated[0];
    assert.ok(migratedReference);
    const { sourceDossierJson, performanceCompositeSource, ...reference } = migratedReference;
    assert.equal(sourceDossierJson, null);
    assert.equal(performanceCompositeSource, 'legacy-unqualified');
    assert.deepEqual(reference, { ...before.references[0] });
    const migratedAsset = db.prepare('SELECT * FROM Asset').all()[0];
    assert.ok(migratedAsset);
    const { sourceUrl, sourceLicense, ...asset } = migratedAsset;
    assert.equal(sourceUrl, null);
    assert.equal(sourceLicense, null);
    assert.deepEqual(asset, { ...before.assets[0] });
    assert.deepEqual(db.prepare('SELECT * FROM ResearchSource').all(), before.sources);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});

// Private space (owner decision, 12 November 2026): every existing reference stays public.
test('private space migration keeps every existing dossier public and unchanged', async () => {
  const { readdirSync } = await import('node:fs');
  const { ResearchDossierSchema, dossierToReference } = await import('../src/lib/research-dossier');
  const db = new DatabaseSync(':memory:');
  try {
    db.exec(readFileSync('prisma/migrations/20260512171730_init/migration.sql', 'utf8'));
    db.exec(readFileSync('prisma/migrations/20261019112000_native_dossier_flow/migration.sql', 'utf8'));
    const bundled = readdirSync('public').filter((name) => name.startsWith('dossier-') && name.endsWith('.json')
      && !name.includes('template') && !name.includes('example'));
    assert.equal(bundled.length, 8, 'The eight public dossiers of the repository.');
    const insert = db.prepare(`INSERT INTO Reference (id,slug,title,brandEmitter,sector,marketPrimary,emissionYear,patternKind,
      manipulationMode,funnelStage,confidence,summary,performanceOverallAttribution,ingestPath,sourceDossierJson,updatedAt)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
    for (const name of bundled) {
      const dossier = ResearchDossierSchema.parse(JSON.parse(readFileSync(`public/${name}`, 'utf8')));
      const { reference: r } = dossierToReference(dossier);
      insert.run(r.id, r.slug, r.title, r.brandEmitter, r.sector, r.marketPrimary, r.emissionYear, r.patternKind,
        r.manipulationMode, r.funnelStage, r.confidence, r.summary, r.performance.overallAttribution, 'manual-dossier',
        JSON.stringify(dossier), 1_762_000_000_000);
    }
    db.exec(`INSERT INTO Asset (id,referenceId,kind,function,role,url,aspectRatio,text)
      SELECT 'asset-' || id, id, 'TEXT', 'TAGLINE', 'HERO', '', '16:9', 'Prior exact text' FROM Reference`);
    const before = db.prepare('SELECT * FROM Reference ORDER BY id').all();
    const assets = db.prepare('SELECT * FROM Asset ORDER BY id').all();
    db.exec(readFileSync('prisma/migrations/20261112090000_private_space/migration.sql', 'utf8'));
    const after = db.prepare('SELECT * FROM Reference ORDER BY id').all();
    assert.equal(after.length, 8);
    for (const [index, row] of after.entries()) {
      const { visibility, visibilityChangedAt, visibilityChangedBy, ...rest } = row;
      assert.deepEqual([visibility, visibilityChangedAt, visibilityChangedBy], ['public', null, null]);
      assert.deepEqual(rest, { ...before[index] });
    }
    assert.deepEqual(db.prepare('SELECT * FROM Asset ORDER BY id').all(), assets);
    assert.deepEqual({ ...db.prepare('SELECT COUNT(*) AS n FROM VisibilityChange').get() }, { n: 0 });
    assert.deepEqual({ ...db.prepare('SELECT COUNT(*) AS n FROM PrivatePurgeRun').get() }, { n: 0 });
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
  } finally { db.close(); }
});
