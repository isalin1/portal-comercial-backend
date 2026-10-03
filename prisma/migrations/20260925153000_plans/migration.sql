CREATE TABLE "plans" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL UNIQUE,
  "dias" INTEGER NOT NULL,
  "nombre_comercial" TEXT NOT NULL,
  "precio" DECIMAL(10,2) NOT NULL,
  "muestra_productos" BOOLEAN NOT NULL DEFAULT false,
  "boton_whatsapp" BOOLEAN NOT NULL DEFAULT false,
  "muestra_telefono" BOOLEAN NOT NULL DEFAULT false,
  "pedidos_empresario" BOOLEAN NOT NULL DEFAULT false,
  "pedidos_cliente" BOOLEAN NOT NULL DEFAULT false,
  "resumen" BOOLEAN NOT NULL DEFAULT false,
  "agenda" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "plans" ("nombre", "dias", "nombre_comercial", "precio", "muestra_productos", "boton_whatsapp", "muestra_telefono", "pedidos_empresario", "pedidos_cliente", "resumen", "agenda")
VALUES
  ('Libre', 30, 'Free', 0, false, false, true, false, false, false, false),
  ('Mensual', 30, 'Emprendedor', 39.90, true, true, false, false, false, false, false),
  ('Trimestral', 90, 'Emprendedor', 99.90, true, true, false, false, false, false, false),
  ('Semestral', 180, 'Empresario', 179.90, true, true, false, true, false, false, true),
  ('Anual', 360, 'Corporativo', 299.90, true, true, false, true, true, true, true);

ALTER TABLE "users" ADD COLUMN "plan_id" INTEGER;
ALTER TABLE "users" ADD CONSTRAINT "users_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

UPDATE "users" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "nombre" = 'Libre') WHERE "plan" = 'FREE';
UPDATE "users" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "nombre" = 'Mensual') WHERE "plan_id" IS NULL AND "vigencia_dias" = 30;
UPDATE "users" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "nombre" = 'Trimestral') WHERE "plan_id" IS NULL AND "vigencia_dias" = 90;
UPDATE "users" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "nombre" = 'Semestral') WHERE "plan_id" IS NULL AND "vigencia_dias" = 180;
UPDATE "users" SET "plan_id" = (SELECT "id" FROM "plans" WHERE "nombre" = 'Anual') WHERE "plan_id" IS NULL AND "vigencia_dias" = 360;

ALTER TABLE "rubros" ADD COLUMN "permite_pedidos" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "rubros" ADD COLUMN "permite_agenda" BOOLEAN NOT NULL DEFAULT false;
UPDATE "rubros" SET "permite_pedidos" = false, "permite_agenda" = true WHERE "name" ILIKE '%profesional%';
