/*
  Warnings:

  - You are about to drop the column `status` on the `salesorders` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `serviceorders` table. All the data in the column will be lost.
  - Added the required column `totalPrice` to the `itemserviceorders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusPay` to the `salesorders` table without a default value. This is not possible if the table is not empty.
  - Added the required column `statusOrder` to the `serviceorders` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "StatusPay" AS ENUM ('UNPAID', 'PARTIAL', 'PAIF');

-- CreateEnum
CREATE TYPE "StatusOrder" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'READY', 'DELIVERED');

-- AlterTable
ALTER TABLE "itemserviceorders" ADD COLUMN     "totalPrice" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "salesorders" DROP COLUMN "status",
ADD COLUMN     "statusPay" "StatusPay" NOT NULL;

-- AlterTable
ALTER TABLE "serviceorders" DROP COLUMN "status",
ADD COLUMN     "statusOrder" "StatusOrder" NOT NULL;

-- DropEnum
DROP TYPE "OrderStatus";

-- DropEnum
DROP TYPE "SaleStatus";
