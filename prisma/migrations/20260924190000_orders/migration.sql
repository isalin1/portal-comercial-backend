CREATE TYPE "OrderFulfillment" AS ENUM ('RECOJO', 'DELIVERY');
CREATE TYPE "OrderStatus" AS ENUM ('REGISTRADO', 'EN_PREPARACION', 'LISTO', 'EN_CAMINO', 'ENTREGADO', 'ANULADO');
CREATE TYPE "OrderLineKind" AS ENUM ('CARTA', 'MENU');

CREATE TABLE "menu_offers" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "estado" BOOLEAN NOT NULL DEFAULT true,
    "business_id" INTEGER NOT NULL,
    CONSTRAINT "menu_offers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "customer_orders" (
    "id" SERIAL NOT NULL,
    "cliente_nombre" TEXT NOT NULL,
    "cliente_celular" TEXT NOT NULL,
    "cliente_direccion" TEXT,
    "entrega" "OrderFulfillment" NOT NULL,
    "estado" "OrderStatus" NOT NULL DEFAULT 'REGISTRADO',
    "business_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "customer_orders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_lines" (
    "id" SERIAL NOT NULL,
    "tipo" "OrderLineKind" NOT NULL,
    "nombre" TEXT NOT NULL,
    "precio_unitario" DECIMAL(10,2) NOT NULL,
    "cantidad_pedida" DECIMAL(10,3) NOT NULL,
    "cantidad_atendida" DECIMAL(10,3) NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "menu_offer_id" INTEGER,
    CONSTRAINT "order_lines_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_menu_dishes" (
    "id" SERIAL NOT NULL,
    "parte" "MenuPart" NOT NULL,
    "nombre" TEXT NOT NULL,
    "linea_id" INTEGER NOT NULL,
    "item_id" INTEGER NOT NULL,
    CONSTRAINT "order_menu_dishes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "order_payments" (
    "id" SERIAL NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "pedido_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "order_payments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "menu_offers" ADD CONSTRAINT "menu_offers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_lines" ADD CONSTRAINT "order_lines_menu_offer_id_fkey" FOREIGN KEY ("menu_offer_id") REFERENCES "menu_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "order_menu_dishes" ADD CONSTRAINT "order_menu_dishes_linea_id_fkey" FOREIGN KEY ("linea_id") REFERENCES "order_lines"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_menu_dishes" ADD CONSTRAINT "order_menu_dishes_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_payments" ADD CONSTRAINT "order_payments_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "customer_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
