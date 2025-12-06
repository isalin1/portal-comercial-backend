/*
  Warnings:

  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `department` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `district` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `province` on the `users` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "users" DROP COLUMN "address",
DROP COLUMN "department",
DROP COLUMN "district",
DROP COLUMN "province";

-- CreateTable
CREATE TABLE "client_locations" (
    "id" SERIAL NOT NULL,
    "department" TEXT,
    "province" TEXT,
    "district" TEXT,
    "address" TEXT,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_locations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "client_locations_userId_key" ON "client_locations"("userId");

-- AddForeignKey
ALTER TABLE "client_locations" ADD CONSTRAINT "client_locations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
