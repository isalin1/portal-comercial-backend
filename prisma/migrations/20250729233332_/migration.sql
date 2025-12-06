/*
  Warnings:

  - Made the column `unit` on table `servicecategories` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "public"."servicecategories" ALTER COLUMN "unit" SET NOT NULL;
