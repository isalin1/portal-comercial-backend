ALTER TABLE "app_settings" ADD COLUMN "max_profesionales_agenda" INTEGER NOT NULL DEFAULT 3;

CREATE TABLE "professionals" (
  "id" SERIAL NOT NULL,
  "nombre" TEXT NOT NULL,
  "celular" TEXT,
  "estado" BOOLEAN NOT NULL DEFAULT true,
  "negocio_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "professionals" ADD CONSTRAINT "professionals_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agendas" ADD COLUMN "profesional_id" INTEGER;

INSERT INTO "professionals" ("nombre", "negocio_id", "updated_at")
SELECT b."nombre_comercial", a."business_id", CURRENT_TIMESTAMP
FROM "agendas" a
JOIN "businesses" b ON b."id" = a."business_id";

UPDATE "agendas" a
SET "profesional_id" = p."id"
FROM "professionals" p
WHERE p."negocio_id" = a."business_id"
  AND a."profesional_id" IS NULL;

ALTER TABLE "agendas" ADD CONSTRAINT "agendas_profesional_id_key" UNIQUE ("profesional_id");
ALTER TABLE "agendas" ADD CONSTRAINT "agendas_profesional_id_fkey" FOREIGN KEY ("profesional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "agendas" DROP CONSTRAINT IF EXISTS "agendas_business_id_key";
CREATE INDEX IF NOT EXISTS "agendas_business_id_idx" ON "agendas"("business_id");

CREATE TABLE "agenda_days" (
  "id" SERIAL NOT NULL,
  "dia_semana" INTEGER,
  "fecha" DATE,
  "abre" VARCHAR(5) NOT NULL,
  "cierra" VARCHAR(5) NOT NULL,
  "minutos_turno" INTEGER NOT NULL,
  "agenda_id" INTEGER NOT NULL,
  CONSTRAINT "agenda_days_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "agenda_slots" (
  "id" SERIAL NOT NULL,
  "inicio" VARCHAR(5) NOT NULL,
  "fin" VARCHAR(5) NOT NULL,
  "activo" BOOLEAN NOT NULL DEFAULT true,
  "dia_id" INTEGER NOT NULL,
  CONSTRAINT "agenda_slots_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "agenda_days_agenda_id_dia_semana_key" ON "agenda_days"("agenda_id", "dia_semana");
CREATE UNIQUE INDEX "agenda_days_agenda_id_fecha_key" ON "agenda_days"("agenda_id", "fecha");
ALTER TABLE "agenda_days" ADD CONSTRAINT "agenda_days_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "agendas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "agenda_slots" ADD CONSTRAINT "agenda_slots_dia_id_fkey" FOREIGN KEY ("dia_id") REFERENCES "agenda_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "appointments" ADD COLUMN "notas" TEXT;
