-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "bookingType" TEXT NOT NULL DEFAULT 'EVENT',
    "eventDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
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
    "contractAcceptedAt" TIMESTAMP(3),
    "contractSignerName" TEXT,
    "contractVersion" TEXT,
    "contractText" TEXT,
    "stripeCheckoutSessionId" TEXT,
    "stripePaymentStatus" TEXT,
    "amountPaidCents" INTEGER NOT NULL DEFAULT 0,
    "paymentMethod" TEXT DEFAULT 'STRIPE',
    "adminNotes" TEXT,
    "rectTablesRequested" INTEGER,
    "roundTablesRequested" INTEGER,
    "chairsRequested" INTEGER,
    "setupNotes" TEXT,
    "managementToken" TEXT,
    "managementTokenExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlockedDate" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BlockedDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowingAvailability" (
    "id" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowingAvailability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowingConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "defaultDurationMinutes" INTEGER NOT NULL DEFAULT 30,
    "maxSlotsPerWindow" INTEGER NOT NULL DEFAULT 999,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowingConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddOn" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AddOn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingAddOn" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "addOnId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "priceAtBooking" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingAddOn_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Booking_managementToken_key" ON "Booking"("managementToken");

-- CreateIndex
CREATE INDEX "Booking_eventDate_idx" ON "Booking"("eventDate");

-- CreateIndex
CREATE UNIQUE INDEX "BlockedDate_date_key" ON "BlockedDate"("date");

-- CreateIndex
CREATE UNIQUE INDEX "ShowingAvailability_dayOfWeek_startTime_endTime_key" ON "ShowingAvailability"("dayOfWeek", "startTime", "endTime");

-- CreateIndex
CREATE UNIQUE INDEX "ShowingConfig_key_key" ON "ShowingConfig"("key");

-- CreateIndex
CREATE INDEX "BookingAddOn_bookingId_idx" ON "BookingAddOn"("bookingId");

-- CreateIndex
CREATE INDEX "BookingAddOn_addOnId_idx" ON "BookingAddOn"("addOnId");

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingAddOn" ADD CONSTRAINT "BookingAddOn_addOnId_fkey" FOREIGN KEY ("addOnId") REFERENCES "AddOn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

