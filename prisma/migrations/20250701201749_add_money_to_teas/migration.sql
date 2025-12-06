/*
  Warnings:

  - You are about to drop the column `name` on the `teas` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "Money" AS ENUM ('SOLES', 'DOLARES');

-- DropIndex
DROP INDEX "teas_name_key";

-- AlterTable
ALTER TABLE "teas" DROP COLUMN "name",
ADD COLUMN     "money" "Money" NOT NULL DEFAULT 'SOLES';
