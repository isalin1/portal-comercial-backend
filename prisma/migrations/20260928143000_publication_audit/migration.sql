CREATE TABLE "publication_changes" (
    "id" SERIAL NOT NULL,
    "negocio_id" INTEGER NOT NULL,
    "ambito" TEXT NOT NULL,
    "registro_id" INTEGER NOT NULL,
    "campo" TEXT NOT NULL,
    "etiqueta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "antes" TEXT,
    "despues" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "publication_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "publication_changes_negocio_id_created_at_idx" ON "publication_changes"("negocio_id", "created_at");

CREATE UNIQUE INDEX "publication_changes_ambito_registro_id_campo_key" ON "publication_changes"("ambito", "registro_id", "campo");

ALTER TABLE "publication_changes" ADD CONSTRAINT "publication_changes_negocio_id_fkey" FOREIGN KEY ("negocio_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
