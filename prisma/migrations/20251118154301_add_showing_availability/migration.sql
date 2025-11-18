-- CreateTable
CREATE TABLE "ShowingAvailability" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ShowingConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxSlotsPerWindow" INTEGER NOT NULL DEFAULT 999,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "ShowingAvailability_dayOfWeek_startTime_endTime_key" ON "ShowingAvailability"("dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "ShowingConfig_key_key" ON "ShowingConfig"("key");
