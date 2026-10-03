CREATE TABLE "zones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "distrito_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "zones_distrito_id_nombre_key" ON "zones"("distrito_id", "nombre");

ALTER TABLE "zones" ADD CONSTRAINT "zones_distrito_id_fkey" FOREIGN KEY ("distrito_id") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "businesses" ADD COLUMN "zona_id" INTEGER;

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
