-- AlterEnum
ALTER TYPE "ItemKind" ADD VALUE IF NOT EXISTS 'OFERTA_DIA';

-- AlterTable
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "precio_referencia" DECIMAL(10,2);
