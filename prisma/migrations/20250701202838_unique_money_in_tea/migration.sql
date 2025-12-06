/*
  Warnings:

  - A unique constraint covering the columns `[money]` on the table `teas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "teas_money_key" ON "teas"("money");
