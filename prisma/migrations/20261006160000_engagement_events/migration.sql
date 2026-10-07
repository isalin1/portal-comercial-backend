-- CreateEnum
CREATE TYPE "EngagementKind" AS ENUM ('BUSINESS_OPEN', 'WHATSAPP_CLICK');

-- CreateTable
CREATE TABLE "engagement_events" (
    "id" SERIAL NOT NULL,
    "tipo" "EngagementKind" NOT NULL,
    "negocio_id" INTEGER NOT NULL,
    "ocurrido_el" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "engagement_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "engagement_events_ocurrido_el_tipo_idx" ON "engagement_events"("ocurrido_el", "tipo");

-- CreateIndex
CREATE INDEX "engagement_events_negocio_id_ocurrido_el_tipo_idx" ON "engagement_events"("negocio_id", "ocurrido_el", "tipo");

-- AddForeignKey
ALTER TABLE "engagement_events" ADD CONSTRAINT "engagement_events_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
