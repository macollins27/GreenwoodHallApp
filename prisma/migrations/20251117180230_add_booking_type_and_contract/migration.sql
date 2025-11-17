-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Booking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "bookingType" TEXT NOT NULL DEFAULT 'EVENT',
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
    "contractAccepted" BOOLEAN NOT NULL DEFAULT false,
    "contractAcceptedAt" DATETIME,
    "contractSignerName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Booking" ("baseAmountCents", "contactEmail", "contactName", "contactPhone", "createdAt", "dayType", "depositCents", "endTime", "eventDate", "eventHours", "eventType", "extraSetupCents", "extraSetupHours", "guestCount", "hourlyRateCents", "id", "notes", "startTime", "status", "totalCents", "updatedAt") SELECT "baseAmountCents", "contactEmail", "contactName", "contactPhone", "createdAt", "dayType", "depositCents", "endTime", "eventDate", "eventHours", "eventType", "extraSetupCents", "extraSetupHours", "guestCount", "hourlyRateCents", "id", "notes", "startTime", "status", "totalCents", "updatedAt" FROM "Booking";
DROP TABLE "Booking";
ALTER TABLE "new_Booking" RENAME TO "Booking";
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
