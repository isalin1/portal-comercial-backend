CREATE TYPE "ItemKind" AS ENUM ('CARTA', 'MENU');
CREATE TYPE "MenuPart" AS ENUM ('ENTRADA', 'SEGUNDO', 'REFRESCO');

ALTER TABLE "items" ADD COLUMN "tipo_plato" "ItemKind" NOT NULL DEFAULT 'CARTA';
ALTER TABLE "items" ADD COLUMN "parte_menu" "MenuPart";

ALTER TABLE "descriptions" ALTER COLUMN "precio" DROP NOT NULL;
ALTER TABLE "descriptions" ALTER COLUMN "unidad_id" DROP NOT NULL;
