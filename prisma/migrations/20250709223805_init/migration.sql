/*
  Warnings:

  - You are about to drop the `clients` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `lots` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `programs` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `quotations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `simulations` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `teas` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `districtId` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('GENERAL', 'ABRIGO', 'FRAZADA', 'EN_SECO');

-- CreateEnum
CREATE TYPE "DocType" AS ENUM ('RUC', 'DNI');

-- CreateEnum
CREATE TYPE "ServiceUnit" AS ENUM ('KILOS', 'PIEZA');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAIF');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED');

-- CreateEnum
CREATE TYPE "MethodPay" AS ENUM ('CASH', 'YAPE_PLIN');

-- DropForeignKey
ALTER TABLE "lots" DROP CONSTRAINT "lots_programId_fkey";

-- DropForeignKey
ALTER TABLE "programs" DROP CONSTRAINT "programs_districtId_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_createdById_fkey";

-- DropForeignKey
ALTER TABLE "quotations" DROP CONSTRAINT "quotations_simulationId_fkey";

-- DropForeignKey
ALTER TABLE "simulations" DROP CONSTRAINT "simulations_clientId_fkey";

-- DropForeignKey
ALTER TABLE "simulations" DROP CONSTRAINT "simulations_lotId_fkey";

-- DropForeignKey
ALTER TABLE "simulations" DROP CONSTRAINT "simulations_teaId_fkey";

-- DropForeignKey
ALTER TABLE "simulations" DROP CONSTRAINT "simulations_userId_fkey";

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "address" TEXT,
ADD COLUMN     "districtId" INTEGER NOT NULL,
ADD COLUMN     "dni" TEXT;

-- DropTable
DROP TABLE "clients";

-- DropTable
DROP TABLE "lots";

-- DropTable
DROP TABLE "programs";

-- DropTable
DROP TABLE "quotations";

-- DropTable
DROP TABLE "simulations";

-- DropTable
DROP TABLE "teas";

-- DropEnum
DROP TYPE "ContactType";

-- DropEnum
DROP TYPE "LotStatus";

-- DropEnum
DROP TYPE "Money";

-- DropEnum
DROP TYPE "QuotationStatus";

-- DropEnum
DROP TYPE "SimulationStatus";

-- DropEnum
DROP TYPE "TimeUnit";

-- CreateTable
CREATE TABLE "business" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "comercialname" TEXT NOT NULL,
    "doctype" "DocType" NOT NULL,
    "numdoc" TEXT NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "business_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pointsales" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "phonenumber" TEXT NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "businesId" INTEGER NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "pointsales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "servicecategories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "servicecategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listservices" (
    "id" SERIAL NOT NULL,
    "type" "ServiceType" NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "servicecategoryId" INTEGER NOT NULL,
    "pointsaleId" INTEGER NOT NULL,

    CONSTRAINT "listservices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "serviceorders" (
    "id" SERIAL NOT NULL,
    "status" "OrderStatus" NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "pointsaleId" INTEGER NOT NULL,

    CONSTRAINT "serviceorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itemserviceorders" (
    "id" SERIAL NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "numberpieces" INTEGER NOT NULL,
    "subtotal" DECIMAL(65,30) NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "listserviceId" INTEGER NOT NULL,
    "serviceorderId" INTEGER NOT NULL,

    CONSTRAINT "itemserviceorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salesorders" (
    "id" SERIAL NOT NULL,
    "total" DECIMAL(65,30) NOT NULL,
    "servicedeadline" TIMESTAMP(3) NOT NULL,
    "status" "SaleStatus" NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "serviceorderId" INTEGER NOT NULL,

    CONSTRAINT "salesorders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" SERIAL NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "methodpay" "MethodPay" NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "salesorderId" INTEGER NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "salesorders_serviceorderId_key" ON "salesorders"("serviceorderId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business" ADD CONSTRAINT "business_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointsales" ADD CONSTRAINT "pointsales_businesId_fkey" FOREIGN KEY ("businesId") REFERENCES "business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pointsales" ADD CONSTRAINT "pointsales_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listservices" ADD CONSTRAINT "listservices_servicecategoryId_fkey" FOREIGN KEY ("servicecategoryId") REFERENCES "servicecategories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listservices" ADD CONSTRAINT "listservices_pointsaleId_fkey" FOREIGN KEY ("pointsaleId") REFERENCES "pointsales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serviceorders" ADD CONSTRAINT "serviceorders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "serviceorders" ADD CONSTRAINT "serviceorders_pointsaleId_fkey" FOREIGN KEY ("pointsaleId") REFERENCES "pointsales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itemserviceorders" ADD CONSTRAINT "itemserviceorders_listserviceId_fkey" FOREIGN KEY ("listserviceId") REFERENCES "listservices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itemserviceorders" ADD CONSTRAINT "itemserviceorders_serviceorderId_fkey" FOREIGN KEY ("serviceorderId") REFERENCES "serviceorders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salesorders" ADD CONSTRAINT "salesorders_serviceorderId_fkey" FOREIGN KEY ("serviceorderId") REFERENCES "serviceorders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_salesorderId_fkey" FOREIGN KEY ("salesorderId") REFERENCES "salesorders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
