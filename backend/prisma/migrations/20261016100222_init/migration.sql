-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('CREATED', 'BOOKING', 'CONFIRMED', 'PROPOSED', 'CLIENT_CONFIRMED', 'IN_PROGRESS', 'COMPLETED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MasterSpecialty" AS ENUM ('ELECTRICIAN', 'PLUMBER', 'WASHING_MACHINE', 'REFRIGERATOR', 'TV_REPAIR', 'COMPUTER', 'MOBILE', 'CARPENTER', 'PAINTER', 'BUILDER', 'LOCKSMITH', 'HEATING', 'AIR_CONDITIONING', 'GAS_TECHNICIAN', 'AUTO_ELECTRICIAN', 'HAIRDRESSER', 'MANICURE', 'NURSE', 'TEACHER', 'HOUSEKEEPER', 'COOK', 'GARDENER');

-- CreateEnum
CREATE TYPE "TimeBlockReason" AS ENUM ('ORDER', 'PERSONAL', 'BREAK', 'DAY_OFF', 'OTHER', 'OFFER');

-- CreateEnum
CREATE TYPE "TimeBlockStatus" AS ENUM ('RESERVED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "BreakType" AS ENUM ('LUNCH', 'WORKSHOP', 'PERSONAL', 'OTHER');

-- CreateEnum
CREATE TYPE "UrgentStatus" AS ENUM ('CREATED', 'SEARCHING', 'MASTER_SELECTED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "MasterOfferStatus" AS ENUM ('SEND', 'ACCEPTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "phone" TEXT,
    "phoneVerifiedAt" TIMESTAMP(3),
    "googleId" TEXT,
    "telegramId" TEXT,
    "name" TEXT,
    "password" TEXT,
    "preferredChannel" TEXT,
    "pushToken" TEXT,
    "latitude" DECIMAL(65,30),
    "longitude" DECIMAL(65,30),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterProfile" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "speciality" "MasterSpecialty" NOT NULL,
    "description" TEXT,
    "photoUrl" TEXT,
    "photoPublicId" TEXT,
    "rating" DOUBLE PRECISION,
    "instagram" TEXT,
    "facebook" TEXT,
    "youtube" TEXT,
    "agreedToTerms" BOOLEAN NOT NULL DEFAULT false,
    "dateAgreeToTerms" TIMESTAMP(3) NOT NULL,
    "minPrice" INTEGER,
    "maxPrice" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "MasterProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "description" TEXT,
    "postalCode" TEXT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'CREATED',
    "cancelledReason" TEXT,
    "dataCancelled" TIMESTAMP(3),
    "cancelledById" TEXT,
    "customerCompleteddAt" TIMESTAMP(3),
    "masterCompleteddAt" TIMESTAMP(3),
    "customerHiddenAt" TIMESTAMP(3),
    "masterHiddenAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterSchedule" (
    "id" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "isWorking" BOOLEAN NOT NULL DEFAULT false,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,

    CONSTRAINT "MasterSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeBlock" (
    "id" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "startAt" TIMESTAMPTZ(3),
    "endAt" TIMESTAMPTZ(3),
    "status" "TimeBlockStatus" NOT NULL,
    "reservationMinutes" INTEGER,
    "reservationExpiresAt" TIMESTAMPTZ(3),
    "orderId" UUID,
    "offerMasterId" UUID,
    "reason" "TimeBlockReason",

    CONSTRAINT "TimeBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScheduleBreak" (
    "id" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "type" "BreakType" NOT NULL,
    "recurrence" TEXT NOT NULL,

    CONSTRAINT "ScheduleBreak_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceArea" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "postalCode" TEXT NOT NULL,
    "radius" DOUBLE PRECISION NOT NULL,
    "masterId" UUID NOT NULL,

    CONSTRAINT "ServiceArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MasterDocument" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "masterId" UUID NOT NULL,

    CONSTRAINT "MasterDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderPhoto" (
    "id" UUID NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "filePublicId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "orderId" UUID,
    "urgentOfferId" UUID,

    CONSTRAINT "OrderPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ZipCodeDirectory" (
    "postalCode" TEXT NOT NULL,
    "cityName" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ZipCodeDirectory_pkey" PRIMARY KEY ("postalCode")
);

-- CreateTable
CREATE TABLE "Complaint" (
    "id" UUID NOT NULL,
    "orderId" UUID NOT NULL,
    "clientId" UUID NOT NULL,
    "masterProfileId" UUID NOT NULL,
    "reason" TEXT NOT NULL,
    "description" VARCHAR(1000),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Complaint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UrgentOffer" (
    "id" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "description" TEXT,
    "postalCode" TEXT NOT NULL,
    "status" "UrgentStatus" NOT NULL DEFAULT 'CREATED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cancelledReason" TEXT,
    "cancelledAt" TIMESTAMP(3),

    CONSTRAINT "UrgentOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OfferMaster" (
    "id" UUID NOT NULL,
    "urgentOfferId" UUID NOT NULL,
    "masterId" UUID NOT NULL,
    "status" "MasterOfferStatus" NOT NULL DEFAULT 'SEND',
    "rejectedReason" TEXT,
    "sendAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "OfferMaster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "MasterProfile_userId_key" ON "MasterProfile"("userId");

-- CreateIndex
CREATE INDEX "MasterProfile_minPrice_maxPrice_idx" ON "MasterProfile"("minPrice", "maxPrice");

-- CreateIndex
CREATE UNIQUE INDEX "MasterSchedule_masterId_dayOfWeek_key" ON "MasterSchedule"("masterId", "dayOfWeek");

-- CreateIndex
CREATE UNIQUE INDEX "TimeBlock_orderId_key" ON "TimeBlock"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "TimeBlock_offerMasterId_key" ON "TimeBlock"("offerMasterId");

-- CreateIndex
CREATE INDEX "ServiceArea_masterId_postalCode_idx" ON "ServiceArea"("masterId", "postalCode");

-- CreateIndex
CREATE INDEX "ServiceArea_postalCode_idx" ON "ServiceArea"("postalCode");

-- CreateIndex
CREATE INDEX "MasterDocument_masterId_idx" ON "MasterDocument"("masterId");

-- CreateIndex
CREATE INDEX "OrderPhoto_orderId_idx" ON "OrderPhoto"("orderId");

-- CreateIndex
CREATE INDEX "ZipCodeDirectory_latitude_longitude_idx" ON "ZipCodeDirectory"("latitude", "longitude");

-- CreateIndex
CREATE UNIQUE INDEX "Complaint_orderId_key" ON "Complaint"("orderId");

-- CreateIndex
CREATE INDEX "Complaint_masterProfileId_idx" ON "Complaint"("masterProfileId");

-- CreateIndex
CREATE INDEX "Complaint_clientId_idx" ON "Complaint"("clientId");

-- CreateIndex
CREATE INDEX "OfferMaster_masterId_status_idx" ON "OfferMaster"("masterId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "OfferMaster_urgentOfferId_masterId_key" ON "OfferMaster"("urgentOfferId", "masterId");

-- AddForeignKey
ALTER TABLE "MasterProfile" ADD CONSTRAINT "MasterProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterSchedule" ADD CONSTRAINT "MasterSchedule_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeBlock" ADD CONSTRAINT "TimeBlock_offerMasterId_fkey" FOREIGN KEY ("offerMasterId") REFERENCES "OfferMaster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBreak" ADD CONSTRAINT "ScheduleBreak_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceArea" ADD CONSTRAINT "ServiceArea_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MasterDocument" ADD CONSTRAINT "MasterDocument_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPhoto" ADD CONSTRAINT "OrderPhoto_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderPhoto" ADD CONSTRAINT "OrderPhoto_urgentOfferId_fkey" FOREIGN KEY ("urgentOfferId") REFERENCES "UrgentOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Complaint" ADD CONSTRAINT "Complaint_masterProfileId_fkey" FOREIGN KEY ("masterProfileId") REFERENCES "MasterProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UrgentOffer" ADD CONSTRAINT "UrgentOffer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMaster" ADD CONSTRAINT "OfferMaster_urgentOfferId_fkey" FOREIGN KEY ("urgentOfferId") REFERENCES "UrgentOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OfferMaster" ADD CONSTRAINT "OfferMaster_masterId_fkey" FOREIGN KEY ("masterId") REFERENCES "MasterProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE EXTENSION IF NOT EXISTS btree_gist;

-- Prevent overlapping active time blocks for the same master
ALTER TABLE "TimeBlock"
ADD CONSTRAINT "TimeBlock_no_overlap"
EXCLUDE USING gist (
    "masterId" WITH =,
    tstzrange("startAt", "endAt", '[)') WITH &&
)
WHERE (
    "status" IN ('RESERVED', 'BLOCKED')
    AND "startAt" IS NOT NULL
    AND "endAt" IS NOT NULL
);
