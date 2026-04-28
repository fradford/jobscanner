-- CreateTable
CREATE TABLE "JobPost" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "sourceId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT,
    "workMode" TEXT,
    "seniority" TEXT,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postedAt" DATETIME
);

-- CreateTable
CREATE TABLE "SalaryBand" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "bottom" INTEGER NOT NULL,
    "top" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    CONSTRAINT "SalaryBand_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPost" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobScore" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "score" INTEGER NOT NULL,
    "seniority" BOOLEAN NOT NULL,
    "location" BOOLEAN NOT NULL,
    "salary" BOOLEAN NOT NULL,
    CONSTRAINT "JobScore_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPost" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Keyword" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "value" TEXT NOT NULL,
    "positiveMatchId" INTEGER,
    "negativeMatchId" INTEGER,
    CONSTRAINT "Keyword_positiveMatchId_fkey" FOREIGN KEY ("positiveMatchId") REFERENCES "JobScore" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Keyword_negativeMatchId_fkey" FOREIGN KEY ("negativeMatchId") REFERENCES "JobScore" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "jobId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    CONSTRAINT "JobApplication_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "JobPost" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "JobScore_jobId_key" ON "JobScore"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_jobId_key" ON "JobApplication"("jobId");
