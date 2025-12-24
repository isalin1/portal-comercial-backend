-- Agregar campo districtId a la tabla pointsales
ALTER TABLE "pointsales" ADD COLUMN IF NOT EXISTS "districtId" INTEGER;

-- Agregar foreign key constraint
ALTER TABLE "pointsales" 
ADD CONSTRAINT "pointsales_districtId_fkey" 
FOREIGN KEY ("districtId") 
REFERENCES "districts"("id") 
ON DELETE SET NULL ON UPDATE CASCADE;


