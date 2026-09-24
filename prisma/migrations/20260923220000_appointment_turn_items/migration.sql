CREATE TABLE "appointment_turns" (
  "id" SERIAL PRIMARY KEY,
  "inicio" TIMESTAMP(3) NOT NULL,
  "fin" TIMESTAMP(3) NOT NULL,
  "cita_id" INTEGER NOT NULL,
  CONSTRAINT "appointment_turns_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "appointment_turns_cita_id_inicio_idx" ON "appointment_turns"("cita_id", "inicio");

INSERT INTO "appointment_turns" ("inicio", "fin", "cita_id")
SELECT "inicio", "fin", "id" FROM "appointments";
