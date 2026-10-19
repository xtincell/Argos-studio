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
