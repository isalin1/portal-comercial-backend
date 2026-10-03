ALTER TABLE "businesses" ADD COLUMN "cobra_delivery" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "businesses" ADD COLUMN "costo_delivery" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "customer_orders" ADD COLUMN "costo_delivery" DECIMAL(10,2) NOT NULL DEFAULT 0;
