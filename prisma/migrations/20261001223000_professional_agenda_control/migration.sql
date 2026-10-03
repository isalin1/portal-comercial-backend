ALTER TABLE "professionals" ADD COLUMN IF NOT EXISTS "control_agenda" BOOLEAN NOT NULL DEFAULT false;

DROP INDEX IF EXISTS "agendas_business_id_key";
