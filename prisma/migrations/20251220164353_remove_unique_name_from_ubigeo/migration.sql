/*
  Warnings:

  - You are about to alter the column `name` on the `departments` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `name` on the `districts` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.
  - You are about to alter the column `name` on the `provinces` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(100)`.

*/
-- DropIndex
DROP INDEX "public"."departments_name_key";

-- DropIndex
DROP INDEX "public"."districts_name_key";

-- DropIndex
DROP INDEX "public"."provinces_name_key";

-- AlterTable
ALTER TABLE "departments" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "districts" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);

-- AlterTable
ALTER TABLE "provinces" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);
