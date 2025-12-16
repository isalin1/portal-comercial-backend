/*
  Warnings:

  - The values [SERVICIO_X_UNIDAD,SERVICIO_POR_PESO] on the enum `ServiceCategoryType` will be removed. If these variants are still used in the database, this will fail.
  - The values [FRAZADA,EN_SECO] on the enum `ServiceType` will be removed. If these variants are still used in the database, this will fail.
  - The values [KILOS,PIEZA] on the enum `ServiceUnit` will be removed. If these variants are still used in the database, this will fail.
  - The values [PAIF] on the enum `StatusPay` will be removed. If these variants are still used in the database, this will fail.
  - You are about to alter the column `amount` on the `payments` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(10,2)`.
  - A unique constraint covering the columns `[code]` on the table `salesorders` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[code]` on the table `serviceorders` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DocType" ADD VALUE 'CE';
ALTER TYPE "DocType" ADD VALUE 'PASAPORTE';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "MethodPay" ADD VALUE 'TRANSFER';
ALTER TYPE "MethodPay" ADD VALUE 'YAPE';
ALTER TYPE "MethodPay" ADD VALUE 'PLIN';
ALTER TYPE "MethodPay" ADD VALUE 'CARD';

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceCategoryType_new" AS ENUM ('LAVADO', 'LAVADO_ESPECIAL', 'LAVADO_EN_SECO', 'PLANCHADO', 'FRAZADAS', 'EDREDONES', 'ZAPATILLAS', 'ALFOMBRAS', 'CORTINAS');
ALTER TABLE "servicecategories" ALTER COLUMN "categoryType" TYPE "ServiceCategoryType_new" USING ("categoryType"::text::"ServiceCategoryType_new");
ALTER TYPE "ServiceCategoryType" RENAME TO "ServiceCategoryType_old";
ALTER TYPE "ServiceCategoryType_new" RENAME TO "ServiceCategoryType";
DROP TYPE "public"."ServiceCategoryType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceType_new" AS ENUM ('GENERAL', 'CASACA', 'ABRIGO', 'CAMISA', 'TERNO', 'PANTALON', 'JEAN', 'CHOMPA', 'CORBATA', 'UNO_PLAZA', 'UNO_MEDIO_PLAZA', 'DOS_PLAZAS', 'QUEEN', 'KING', 'OTROS');
ALTER TABLE "listservices" ALTER COLUMN "type" TYPE "ServiceType_new" USING ("type"::text::"ServiceType_new");
ALTER TYPE "ServiceType" RENAME TO "ServiceType_old";
ALTER TYPE "ServiceType_new" RENAME TO "ServiceType";
DROP TYPE "public"."ServiceType_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "ServiceUnit_new" AS ENUM ('KILOGRAM', 'UNIT', 'PAIR', 'METER');
ALTER TABLE "servicecategories" ALTER COLUMN "unit" TYPE "ServiceUnit_new" USING ("unit"::text::"ServiceUnit_new");
ALTER TYPE "ServiceUnit" RENAME TO "ServiceUnit_old";
ALTER TYPE "ServiceUnit_new" RENAME TO "ServiceUnit";
DROP TYPE "public"."ServiceUnit_old";
COMMIT;

-- AlterEnum
BEGIN;
CREATE TYPE "StatusPay_new" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');
ALTER TABLE "salesorders" ALTER COLUMN "statusPay" TYPE "StatusPay_new" USING ("statusPay"::text::"StatusPay_new");
ALTER TYPE "StatusPay" RENAME TO "StatusPay_old";
ALTER TYPE "StatusPay_new" RENAME TO "StatusPay";
DROP TYPE "public"."StatusPay_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "public"."payments" DROP CONSTRAINT "payments_salesorderId_fkey";

-- AlterTable
ALTER TABLE "business" ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "itemserviceorders" ADD COLUMN     "code" TEXT,
ADD COLUMN     "observations" TEXT,
ADD COLUMN     "statusOrder" "StatusOrder" NOT NULL DEFAULT 'RECEIVED';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "datepaid" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "salesorders" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "serviceorders" ADD COLUMN     "code" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "clientBusinesId" INTEGER;

-- CreateTable
CREATE TABLE "expenses" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "recipient" TEXT NOT NULL,
    "concept" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "pointsaleId" INTEGER NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_contributions" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "concept" TEXT,
    "notes" TEXT,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "pointsaleId" INTEGER NOT NULL,

    CONSTRAINT "cash_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_withdrawals" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "concept" TEXT,
    "notes" TEXT,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "pointsaleId" INTEGER NOT NULL,

    CONSTRAINT "cash_withdrawals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plans" (
    "id" SERIAL NOT NULL,
    "tipo" TEXT NOT NULL,
    "nombrePeriodo" TEXT NOT NULL,
    "diasPeriodo" INTEGER NOT NULL,
    "costo" DECIMAL(10,2),
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_plans" (
    "id" SERIAL NOT NULL,
    "busines_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'ACTIVO',
    "fecha_pago" DATE,
    "fecha_suspension" DATE,
    "dias_suspendidos" INTEGER NOT NULL DEFAULT 0,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plan_payments" (
    "id" SERIAL NOT NULL,
    "business_plan_id" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "fecha_pago" DATE NOT NULL,
    "metodo_pago" TEXT,
    "comprobante" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plan_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "cash_contributions_pointsaleId_date_idx" ON "cash_contributions"("pointsaleId", "date");

-- CreateIndex
CREATE INDEX "cash_withdrawals_pointsaleId_date_idx" ON "cash_withdrawals"("pointsaleId", "date");

-- CreateIndex
CREATE INDEX "business_plans_busines_id_idx" ON "business_plans"("busines_id");

-- CreateIndex
CREATE INDEX "business_plans_estado_idx" ON "business_plans"("estado");

-- CreateIndex
CREATE INDEX "business_plans_fecha_fin_idx" ON "business_plans"("fecha_fin");

-- CreateIndex
CREATE UNIQUE INDEX "business_plans_busines_id_plan_id_fecha_inicio_key" ON "business_plans"("busines_id", "plan_id", "fecha_inicio");

-- CreateIndex
CREATE INDEX "plan_payments_business_plan_id_idx" ON "plan_payments"("business_plan_id");

-- CreateIndex
CREATE INDEX "plan_payments_estado_idx" ON "plan_payments"("estado");

-- CreateIndex
CREATE UNIQUE INDEX "salesorders_code_key" ON "salesorders"("code");

-- CreateIndex
CREATE UNIQUE INDEX "serviceorders_code_key" ON "serviceorders"("code");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientBusinesId_fkey" FOREIGN KEY ("clientBusinesId") REFERENCES "business"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_salesorderId_fkey" FOREIGN KEY ("salesorderId") REFERENCES "salesorders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_pointsaleId_fkey" FOREIGN KEY ("pointsaleId") REFERENCES "pointsales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_contributions" ADD CONSTRAINT "cash_contributions_pointsaleId_fkey" FOREIGN KEY ("pointsaleId") REFERENCES "pointsales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_withdrawals" ADD CONSTRAINT "cash_withdrawals_pointsaleId_fkey" FOREIGN KEY ("pointsaleId") REFERENCES "pointsales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_busines_id_fkey" FOREIGN KEY ("busines_id") REFERENCES "business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_plans" ADD CONSTRAINT "business_plans_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_payments" ADD CONSTRAINT "plan_payments_business_plan_id_fkey" FOREIGN KEY ("business_plan_id") REFERENCES "business_plans"("id") ON DELETE CASCADE ON UPDATE CASCADE;
