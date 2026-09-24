CREATE TYPE "AppointmentStatus" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'ANULADA');
CREATE TYPE "AgendaNoticeTarget" AS ENUM ('CLIENTE', 'PROFESIONAL');

CREATE TABLE "agendas" (
  "id" SERIAL PRIMARY KEY,
  "minutos_turno" INTEGER NOT NULL DEFAULT 30,
  "abre" VARCHAR(5),
  "cierra" VARCHAR(5),
  "dias" TEXT,
  "avisar_cliente" BOOLEAN NOT NULL DEFAULT true,
  "avisar_profesional" BOOLEAN NOT NULL DEFAULT true,
  "requiere_pago" BOOLEAN NOT NULL DEFAULT false,
  "business_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agendas_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "agendas_business_id_key" ON "agendas"("business_id");

CREATE TABLE "agenda_services" (
  "id" SERIAL PRIMARY KEY,
  "nombre" TEXT NOT NULL,
  "duracion_min" INTEGER NOT NULL,
  "precio" DECIMAL(10,2) NOT NULL,
  "estado" BOOLEAN NOT NULL DEFAULT true,
  "agenda_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "agenda_services_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "agendas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "appointments" (
  "id" SERIAL PRIMARY KEY,
  "servicio" TEXT NOT NULL,
  "duracion_min" INTEGER NOT NULL,
  "precio" DECIMAL(10,2) NOT NULL,
  "cliente_user_id" INTEGER NOT NULL,
  "cliente_nombre" TEXT NOT NULL,
  "cliente_celular" TEXT NOT NULL,
  "cliente_direccion" TEXT NOT NULL,
  "cliente_dni" TEXT NOT NULL,
  "punto_venta_id" INTEGER,
  "profesional_celular" TEXT,
  "inicio" TIMESTAMP(3) NOT NULL,
  "fin" TIMESTAMP(3) NOT NULL,
  "estado" "AppointmentStatus" NOT NULL DEFAULT 'PENDIENTE',
  "agenda_id" INTEGER NOT NULL,
  "servicio_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "appointments_agenda_id_fkey" FOREIGN KEY ("agenda_id") REFERENCES "agendas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "appointments_servicio_id_fkey" FOREIGN KEY ("servicio_id") REFERENCES "agenda_services"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "appointments_agenda_id_inicio_idx" ON "appointments"("agenda_id", "inicio");

CREATE TABLE "appointment_payments" (
  "id" SERIAL PRIMARY KEY,
  "monto" DECIMAL(10,2) NOT NULL,
  "nota" TEXT,
  "pagado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "cita_id" INTEGER NOT NULL,
  CONSTRAINT "appointment_payments_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "appointment_notices" (
  "id" SERIAL PRIMARY KEY,
  "destino" "AgendaNoticeTarget" NOT NULL,
  "celular" TEXT NOT NULL,
  "mensaje" TEXT NOT NULL,
  "whatsapp_url" TEXT NOT NULL,
  "cita_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appointment_notices_cita_id_fkey" FOREIGN KEY ("cita_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
