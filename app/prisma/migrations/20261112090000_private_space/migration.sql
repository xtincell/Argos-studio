-- Private space (owner decision of 12 November 2026, ADR-0010).
-- Additive only: the three columns are appended to "Reference" in place (no table copy, no row
-- rewritten). Every existing reference receives visibility 'public'; nothing published disappears.

-- AlterTable
ALTER TABLE "Reference" ADD COLUMN "visibility" TEXT NOT NULL DEFAULT 'public';
ALTER TABLE "Reference" ADD COLUMN "visibilityChangedAt" DATETIME;
ALTER TABLE "Reference" ADD COLUMN "visibilityChangedBy" TEXT;

-- CreateTable
CREATE TABLE "VisibilityChange" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "fromVisibility" TEXT NOT NULL,
    "toVisibility" TEXT NOT NULL,
    "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "changedBy" TEXT NOT NULL,
    CONSTRAINT "VisibilityChange_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PrivatePurgeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ranAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cutoff" DATETIME NOT NULL,
    "retentionMonths" INTEGER NOT NULL,
    "purgedCount" INTEGER NOT NULL,
    "trigger" TEXT NOT NULL
);

-- CreateIndex
CREATE INDEX "Reference_visibility_idx" ON "Reference"("visibility");

-- CreateIndex
CREATE INDEX "VisibilityChange_referenceId_idx" ON "VisibilityChange"("referenceId");

-- CreateIndex
CREATE INDEX "PrivatePurgeRun_ranAt_idx" ON "PrivatePurgeRun"("ranAt");
