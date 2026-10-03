ALTER TABLE "users" ADD COLUMN "plan_pendiente_id" INTEGER;
ALTER TABLE "users" ADD CONSTRAINT "users_plan_pendiente_id_fkey" FOREIGN KEY ("plan_pendiente_id") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
