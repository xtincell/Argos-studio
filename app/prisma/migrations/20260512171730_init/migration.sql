-- CreateTable
CREATE TABLE "Reference" (
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
    "performanceComposite" INTEGER NOT NULL DEFAULT 50,
    "performancePrimaryGoalsJson" TEXT NOT NULL DEFAULT '[]',
    "performanceOverallAttribution" TEXT NOT NULL,
    "performanceRationale" TEXT,
    "ingestPath" TEXT NOT NULL,
    "researcherName" TEXT,
    "researcherContact" TEXT,
    "researcherToolUsed" TEXT,
    "researchDate" TEXT,
    "ingestedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "function" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "posterUrl" TEXT,
    "aspectRatio" TEXT NOT NULL,
    "text" TEXT,
    "caption" TEXT,
    "alt" TEXT,
    "durationSec" INTEGER,
    "format" TEXT,
    "extractionMethod" TEXT,
    "derivedFromAssetId" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Asset_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Asset_derivedFromAssetId_fkey" FOREIGN KEY ("derivedFromAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StructuralAxis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "confidence" REAL NOT NULL,
    "evidence" TEXT,
    "sourceUrl" TEXT,
    CONSTRAINT "StructuralAxis_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PerformanceMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" REAL NOT NULL,
    "displayValue" TEXT,
    "goal" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopedAssetId" TEXT,
    "attribution" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "measuredAtYearMonth" TEXT,
    CONSTRAINT "PerformanceMetric_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "PerformanceMetric_scopedAssetId_fkey" FOREIGN KEY ("scopedAssetId") REFERENCES "Asset" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "publishedDate" TEXT,
    "accessedDate" TEXT NOT NULL,
    "license" TEXT NOT NULL,
    "excerpt" TEXT,
    "role" TEXT NOT NULL,
    CONSTRAINT "ResearchSource_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Filiation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fromRefId" TEXT NOT NULL,
    "toRefId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "evidence" TEXT,
    "confidence" REAL NOT NULL DEFAULT 0.7,
    CONSTRAINT "Filiation_fromRefId_fkey" FOREIGN KEY ("fromRefId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Filiation_toRefId_fkey" FOREIGN KEY ("toRefId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExpertAnnotation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "referenceId" TEXT NOT NULL,
    "annotatorName" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "targetedAxesJson" TEXT NOT NULL DEFAULT '[]',
    "qualityScore" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ExpertAnnotation_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "Reference" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ConsultationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "briefJson" TEXT NOT NULL,
    "diagnosisJson" TEXT NOT NULL,
    "positionsProposedJson" TEXT NOT NULL,
    "positionChosenJson" TEXT NOT NULL,
    "challengeResultJson" TEXT NOT NULL,
    "varianceBudget" REAL NOT NULL,
    "injectedReferenceIdsJson" TEXT NOT NULL DEFAULT '[]',
    "consultedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumerType" TEXT NOT NULL,
    "consumerId" TEXT,
    "resultingAssetId" TEXT,
    "performanceMeasuredJson" TEXT
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" TEXT NOT NULL DEFAULT 'free',
    "apiKey" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Reference_slug_key" ON "Reference"("slug");

-- CreateIndex
CREATE INDEX "Reference_brandEmitter_idx" ON "Reference"("brandEmitter");

-- CreateIndex
CREATE INDEX "Reference_sector_idx" ON "Reference"("sector");

-- CreateIndex
CREATE INDEX "Reference_marketPrimary_idx" ON "Reference"("marketPrimary");

-- CreateIndex
CREATE INDEX "Reference_emissionYear_idx" ON "Reference"("emissionYear");

-- CreateIndex
CREATE INDEX "Reference_patternKind_idx" ON "Reference"("patternKind");

-- CreateIndex
CREATE INDEX "Reference_manipulationMode_idx" ON "Reference"("manipulationMode");

-- CreateIndex
CREATE INDEX "Reference_ingestPath_idx" ON "Reference"("ingestPath");

-- CreateIndex
CREATE INDEX "Asset_referenceId_idx" ON "Asset"("referenceId");

-- CreateIndex
CREATE INDEX "Asset_function_idx" ON "Asset"("function");

-- CreateIndex
CREATE INDEX "Asset_kind_idx" ON "Asset"("kind");

-- CreateIndex
CREATE INDEX "StructuralAxis_referenceId_idx" ON "StructuralAxis"("referenceId");

-- CreateIndex
CREATE INDEX "StructuralAxis_name_idx" ON "StructuralAxis"("name");

-- CreateIndex
CREATE INDEX "PerformanceMetric_referenceId_idx" ON "PerformanceMetric"("referenceId");

-- CreateIndex
CREATE INDEX "PerformanceMetric_kind_idx" ON "PerformanceMetric"("kind");

-- CreateIndex
CREATE INDEX "PerformanceMetric_goal_idx" ON "PerformanceMetric"("goal");

-- CreateIndex
CREATE INDEX "ResearchSource_referenceId_idx" ON "ResearchSource"("referenceId");

-- CreateIndex
CREATE INDEX "ResearchSource_license_idx" ON "ResearchSource"("license");

-- CreateIndex
CREATE INDEX "Filiation_fromRefId_idx" ON "Filiation"("fromRefId");

-- CreateIndex
CREATE INDEX "Filiation_toRefId_idx" ON "Filiation"("toRefId");

-- CreateIndex
CREATE UNIQUE INDEX "Filiation_fromRefId_toRefId_key" ON "Filiation"("fromRefId", "toRefId");

-- CreateIndex
CREATE INDEX "ExpertAnnotation_referenceId_idx" ON "ExpertAnnotation"("referenceId");

-- CreateIndex
CREATE INDEX "ConsultationRecord_consultedAt_idx" ON "ConsultationRecord"("consultedAt");

-- CreateIndex
CREATE INDEX "ConsultationRecord_consumerType_idx" ON "ConsultationRecord"("consumerType");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_apiKey_key" ON "User"("apiKey");
