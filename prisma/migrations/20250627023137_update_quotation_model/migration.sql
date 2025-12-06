/*
  Warnings:

  - You are about to drop the column `contactType` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `initialquote` on the `quotations` table. All the data in the column will be lost.
  - You are about to drop the column `numquotas` on the `quotations` table. All the data in the column will be lost.
  - Added the required column `amountFinanced` to the `quotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `intGenerated` to the `quotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quotaValue` to the `quotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saleValue` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "contactType",
DROP COLUMN "initialquote",
DROP COLUMN "numquotas",
ADD COLUMN     "amountFinanced" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "intGenerated" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "quotaValue" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "saleValue" DECIMAL(65,30) NOT NULL;
