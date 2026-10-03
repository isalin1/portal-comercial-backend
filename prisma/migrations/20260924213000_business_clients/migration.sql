CREATE TABLE "business_clients" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "celular" TEXT NOT NULL,
    "direccion" TEXT,
    "business_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "business_clients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "business_clients_business_id_celular_key" ON "business_clients"("business_id", "celular");

ALTER TABLE "business_clients" ADD CONSTRAINT "business_clients_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "customer_orders" ADD COLUMN "client_id" INTEGER;

INSERT INTO "business_clients" ("nombre", "celular", "direccion", "business_id", "updated_at")
SELECT DISTINCT ON ("business_id", "cliente_celular")
    "cliente_nombre", "cliente_celular", "cliente_direccion", "business_id", CURRENT_TIMESTAMP
FROM "customer_orders"
ORDER BY "business_id", "cliente_celular", "id" DESC;

UPDATE "customer_orders" AS o
SET "client_id" = c."id"
FROM "business_clients" AS c
WHERE c."business_id" = o."business_id" AND c."celular" = o."cliente_celular";

ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "business_clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "order_stages" (
    "id" SERIAL NOT NULL,
    "estado" "OrderStatus" NOT NULL,
    "iniciado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pedido_id" INTEGER NOT NULL,
    CONSTRAINT "order_stages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_stages_pedido_id_estado_key" ON "order_stages"("pedido_id", "estado");

ALTER TABLE "order_stages" ADD CONSTRAINT "order_stages_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "order_stages" ("estado", "iniciado_en", "pedido_id")
SELECT 'REGISTRADO', "created_at", "id" FROM "customer_orders";

INSERT INTO "order_stages" ("estado", "iniciado_en", "pedido_id")
SELECT "estado", "updated_at", "id" FROM "customer_orders"
WHERE "estado" <> 'REGISTRADO'
ON CONFLICT DO NOTHING;
