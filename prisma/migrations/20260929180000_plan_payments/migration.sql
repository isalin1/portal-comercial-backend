CREATE TABLE "plan_payments" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "plan_id" INTEGER NOT NULL,
    "dias" INTEGER NOT NULL,
    "monto" DECIMAL(10,2) NOT NULL,
    "nombre_plan" TEXT NOT NULL,
    "nombre_comercial" TEXT NOT NULL,
    "fecha" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_payments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "plan_payments_fecha_idx" ON "plan_payments"("fecha");

ALTER TABLE "plan_payments" ADD CONSTRAINT "plan_payments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "plan_payments" ADD CONSTRAINT "plan_payments_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
