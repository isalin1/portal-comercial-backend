-- AlterTable
ALTER TABLE "users" ADD COLUMN "fecha_inicio_vigencia" DATE,
ADD COLUMN "fecha_fin_vigencia" DATE;

-- AlterTable
ALTER TABLE "rubros" ADD COLUMN "imagen_url" TEXT;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN "imagen_url" TEXT;

-- AlterTable
ALTER TABLE "businesses" ADD COLUMN "imagen_url" TEXT;
