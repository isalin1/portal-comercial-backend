ALTER TABLE "businesses" ADD COLUMN "exige_pago_pedido" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "customer_orders" ADD COLUMN "registrado_sin_pago" BOOLEAN NOT NULL DEFAULT false;
