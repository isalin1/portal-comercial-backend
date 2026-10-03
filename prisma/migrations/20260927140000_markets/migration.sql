CREATE TABLE "commercial_groups" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "commercial_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "commercial_groups_name_key" ON "commercial_groups"("name");

INSERT INTO "commercial_groups" ("name", "updated_at")
VALUES ('Mercados y Zonas Comerciales', CURRENT_TIMESTAMP);

CREATE TABLE "markets" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "grupo_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "markets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "markets_grupo_id_name_key" ON "markets"("grupo_id", "name");

ALTER TABLE "markets" ADD CONSTRAINT "markets_grupo_id_fkey" FOREIGN KEY ("grupo_id") REFERENCES "commercial_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "businesses" ADD COLUMN "mercado_id" INTEGER;

ALTER TABLE "businesses" ADD CONSTRAINT "businesses_mercado_id_fkey" FOREIGN KEY ("mercado_id") REFERENCES "markets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
