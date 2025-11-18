-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "adminNotes" TEXT;
ALTER TABLE "Booking" ADD COLUMN "paymentMethod" TEXT DEFAULT 'STRIPE';
