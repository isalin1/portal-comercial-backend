-- AlterTable
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "pendiente_empresario" BOOLEAN NOT NULL DEFAULT false;
