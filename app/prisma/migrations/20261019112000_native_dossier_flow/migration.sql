-- AlterTable
ALTER TABLE "Asset" ADD COLUMN "sourceLicense" TEXT;
ALTER TABLE "Asset" ADD COLUMN "sourceUrl" TEXT;

-- CreateTable
CREATE TABLE "ReferenceRevision" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "versionAt" DATETIME NOT NULL,
    "snapshotJson" TEXT NOT NULL,
    "retainedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReferenceRevision_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Reference" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "brandEmitter" TEXT NOT NULL,
    "agencyCreator" TEXT,
    "sector" TEXT NOT NULL,
    "marketPrimary" TEXT NOT NULL,
    "marketsSecondaryJson" TEXT NOT NULL DEFAULT '[]',
    "emissionYear" INTEGER NOT NULL,
    "campaignParent" TEXT,
    "patternKind" TEXT NOT NULL,
    "manipulationMode" TEXT NOT NULL,
    "funnelStage" TEXT NOT NULL,
    "pillarsJson" TEXT NOT NULL DEFAULT '[]',
    "operationGoalsJson" TEXT NOT NULL DEFAULT '[]',
    "victoryTypesJson" TEXT NOT NULL DEFAULT '[]',
    "confidence" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "patternObservation" TEXT,
    "significance" TEXT,
    "performanceComposite" INTEGER,
    "performanceCompositeSource" TEXT NOT NULL DEFAULT 'legacy-unqualified',
    "performancePrimaryGoalsJson" TEXT NOT NULL DEFAULT '[]',
    "performanceOverallAttribution" TEXT NOT NULL,
    "performanceRationale" TEXT,
    "ingestPath" TEXT NOT NULL,
    "researcherName" TEXT,
    "researcherContact" TEXT,
    "researcherToolUsed" TEXT,
    "sourceDossierJson" TEXT,
    "researchDate" TEXT,
    "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Reference" ("agencyCreator", "brandEmitter", "campaignParent", "confidence", "emissionYear", "funnelStage", "id", "ingestPath", "ingestedAt", "manipulationMode", "marketPrimary", "marketsSecondaryJson", "operationGoalsJson", "patternKind", "patternObservation", "performanceComposite", "performanceOverallAttribution", "performancePrimaryGoalsJson", "performanceRationale", "pillarsJson", "researchDate", "researcherContact", "researcherName", "researcherToolUsed", "sector", "significance", "slug", "summary", "title", "updatedAt", "victoryTypesJson") SELECT "agencyCreator", "brandEmitter", "campaignParent", "confidence", "emissionYear", "funnelStage", "id", "ingestPath", "ingestedAt", "manipulationMode", "marketPrimary", "marketsSecondaryJson", "operationGoalsJson", "patternKind", "patternObservation", "performanceComposite", "performanceOverallAttribution", "performancePrimaryGoalsJson", "performanceRationale", "pillarsJson", "researchDate", "researcherContact", "researcherName", "researcherToolUsed", "sector", "significance", "slug", "summary", "title", "updatedAt", "victoryTypesJson" FROM "Reference";
DROP TABLE "Reference";
ALTER TABLE "new_Reference" RENAME TO "Reference";
CREATE UNIQUE INDEX "Reference_slug_key" ON "Reference"("slug");
CREATE INDEX "Reference_brandEmitter_idx" ON "Reference"("brandEmitter");
CREATE INDEX "Reference_sector_idx" ON "Reference"("sector");
CREATE INDEX "Reference_marketPrimary_idx" ON "Reference"("marketPrimary");
CREATE INDEX "Reference_emissionYear_idx" ON "Reference"("emissionYear");
CREATE INDEX "Reference_patternKind_idx" ON "Reference"("patternKind");
CREATE INDEX "Reference_manipulationMode_idx" ON "Reference"("manipulationMode");
CREATE INDEX "Reference_ingestPath_idx" ON "Reference"("ingestPath");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ReferenceRevision_referenceId_versionAt_key" ON "ReferenceRevision"("referenceId", "versionAt");
