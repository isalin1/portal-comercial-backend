/*
  Warnings:

  - Added the required column `categoryType` to the `servicecategories` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `unit` on the `servicecategories` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."ServiceCategoryType" AS ENUM ('SERVICIO_X_UNIDAD', 'SERVICIO_POR_PESO');

-- Add categoryType column with default value
ALTER TABLE "public"."servicecategories" ADD COLUMN "categoryType" "public"."ServiceCategoryType" NOT NULL DEFAULT 'SERVICIO_X_UNIDAD';

-- Update categoryType based on existing unit values
UPDATE "public"."servicecategories" SET "categoryType" = 'SERVICIO_POR_PESO' WHERE "unit" = 'KILO';
UPDATE "public"."servicecategories" SET "categoryType" = 'SERVICIO_X_UNIDAD' WHERE "unit" = 'PIEZA';

-- Create temporary column for unit conversion
ALTER TABLE "public"."servicecategories" ADD COLUMN "unit_new" "public"."ServiceUnit";

-- Update unit_new based on existing unit values
UPDATE "public"."servicecategories" SET "unit_new" = 'KILOS' WHERE "unit" = 'KILO';
UPDATE "public"."servicecategories" SET "unit_new" = 'PIEZA' WHERE "unit" = 'PIEZA';

-- Drop old unit column and rename new one
ALTER TABLE "public"."servicecategories" DROP COLUMN "unit";
ALTER TABLE "public"."servicecategories" RENAME COLUMN "unit_new" TO "unit";

-- Remove default value from categoryType
ALTER TABLE "public"."servicecategories" ALTER COLUMN "categoryType" DROP DEFAULT;
