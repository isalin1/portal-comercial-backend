ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDIENTE_APROBACION';

ALTER TABLE "customer_orders" ADD COLUMN "client_user_id" INTEGER;
ALTER TABLE "customer_orders" ADD COLUMN "point_sale_id" INTEGER;

ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_client_user_id_fkey" FOREIGN KEY ("client_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "customer_orders" ADD CONSTRAINT "customer_orders_point_sale_id_fkey" FOREIGN KEY ("point_sale_id") REFERENCES "point_sales"("id") ON DELETE SET NULL ON UPDATE CASCADE;
