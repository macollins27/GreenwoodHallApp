-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "eventDate" DATETIME NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "dayType" TEXT NOT NULL,
    "hourlyRateCents" INTEGER NOT NULL,
    "eventHours" INTEGER NOT NULL,
    "extraSetupHours" INTEGER NOT NULL DEFAULT 0,
    "baseAmountCents" INTEGER NOT NULL,
    "extraSetupCents" INTEGER NOT NULL,
    "depositCents" INTEGER NOT NULL,
    "totalCents" INTEGER NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "eventType" TEXT NOT NULL,
    "guestCount" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "Booking_eventDate_key" ON "Booking"("eventDate");
