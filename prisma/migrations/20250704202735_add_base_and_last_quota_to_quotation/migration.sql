/*
  Warnings:

  - You are about to drop the column `quotaValue` on the `quotations` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[phone]` on the table `clients` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[clientId,lotId,initialquote,teaId,numquotas]` on the table `simulations` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `baseQuota` to the `quotations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastQuota` to the `quotations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "quotations" DROP COLUMN "quotaValue",
ADD COLUMN     "baseQuota" DECIMAL(65,30) NOT NULL,
ADD COLUMN     "lastQuota" DECIMAL(65,30) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "clients_phone_key" ON "clients"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "simulations_clientId_lotId_initialquote_teaId_numquotas_key" ON "simulations"("clientId", "lotId", "initialquote", "teaId", "numquotas");
