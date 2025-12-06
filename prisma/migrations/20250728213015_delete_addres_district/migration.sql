/*
  Warnings:

  - You are about to drop the column `address` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `districtId` on the `users` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "users" DROP CONSTRAINT "users_districtId_fkey";

-- AlterTable
ALTER TABLE "users" DROP COLUMN "address",
DROP COLUMN "districtId",
ALTER COLUMN "role" SET DEFAULT 'ADMIN';
