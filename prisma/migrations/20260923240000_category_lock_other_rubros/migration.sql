UPDATE "businesses" AS business
SET "categoria_id" = chosen.category_id
FROM (
  SELECT point."business_id", MIN(item."categoria_id") AS category_id
  FROM "items" AS item
  JOIN "point_sales" AS point ON point."id" = item."punto_venta_id"
  GROUP BY point."business_id"
  HAVING COUNT(DISTINCT item."categoria_id") = 1
) AS chosen
WHERE business."id" = chosen.business_id
  AND business."categoria_id" IS NULL
  AND EXISTS (
    SELECT 1
    FROM "rubros" AS rubro
    WHERE rubro."id" = business."rubro_id"
      AND (
        rubro."name" ILIKE '%alimento%'
        OR rubro."name" ILIKE '%comercio%'
        OR rubro."name" ILIKE '%servicio%'
      )
  );
