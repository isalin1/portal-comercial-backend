ALTER TABLE "point_sales" ADD COLUMN "cobra_delivery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "point_sales" ADD COLUMN "costo_delivery" DECIMAL(10,2) NOT NULL DEFAULT 0;

UPDATE "point_sales" AS point
SET "cobra_delivery" = business."cobra_delivery",
    "costo_delivery" = business."costo_delivery"
FROM "businesses" AS business
WHERE point."business_id" = business."id";
