CREATE TABLE "units" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "units_nombre_key" ON "units"("nombre");

INSERT INTO "units" ("nombre", "updated_at") VALUES ('Unidad', CURRENT_TIMESTAMP), ('Kg', CURRENT_TIMESTAMP);

ALTER TABLE "descriptions" ADD COLUMN "unidad_id" INTEGER;

UPDATE "descriptions" SET "unidad_id" = (SELECT "id" FROM "units" WHERE "nombre" = 'Unidad');

ALTER TABLE "descriptions" ALTER COLUMN "unidad_id" SET NOT NULL;

ALTER TABLE "descriptions" ADD CONSTRAINT "descriptions_unidad_id_fkey" FOREIGN KEY ("unidad_id") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
