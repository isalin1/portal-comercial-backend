-- CreateEnum
CREATE TYPE "QuotationStatus" AS ENUM ('DRAFT', 'FINAL');

-- AlterTable
ALTER TABLE "quotations" ADD COLUMN     "status" "QuotationStatus" NOT NULL DEFAULT 'DRAFT';
