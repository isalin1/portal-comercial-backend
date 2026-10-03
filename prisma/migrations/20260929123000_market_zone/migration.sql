ALTER TABLE "markets" ADD COLUMN "zona_id" INTEGER;

UPDATE "markets" AS market
SET "zona_id" = chosen.zone_id
FROM (
  SELECT "mercado_id", MIN("zona_id") AS zone_id
  FROM "businesses"
  WHERE "mercado_id" IS NOT NULL AND "zona_id" IS NOT NULL
  GROUP BY "mercado_id"
  HAVING COUNT(DISTINCT "zona_id") = 1
) AS chosen
WHERE market."id" = chosen."mercado_id";

DROP INDEX "markets_grupo_id_name_key";

CREATE UNIQUE INDEX "markets_zona_id_name_key" ON "markets"("zona_id", "name");

ALTER TABLE "markets" ADD CONSTRAINT "markets_zona_id_fkey" FOREIGN KEY ("zona_id") REFERENCES "zones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
