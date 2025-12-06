-- AlterTable
ALTER TABLE "simulations" ADD COLUMN     "amountFinanced" DECIMAL(65,30),
ADD COLUMN     "intGenerated" DECIMAL(65,30),
ADD COLUMN     "quotaValue" DECIMAL(65,30),
ADD COLUMN     "saleValue" DECIMAL(65,30);
