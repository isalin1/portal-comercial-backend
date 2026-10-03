ALTER TABLE "users" ADD COLUMN "vigencia_dias" INTEGER;
ALTER TABLE "app_settings" ADD COLUMN "vigencia_plan_free" INTEGER NOT NULL DEFAULT 30;

UPDATE "users"
SET "vigencia_dias" = CASE
  WHEN ("fecha_fin_vigencia" - "fecha_inicio_vigencia") <= 45 THEN 30
  WHEN ("fecha_fin_vigencia" - "fecha_inicio_vigencia") <= 120 THEN 90
  WHEN ("fecha_fin_vigencia" - "fecha_inicio_vigencia") <= 270 THEN 180
  ELSE 360
END
WHERE "plan" IS DISTINCT FROM 'FREE'
  AND "fecha_fin_vigencia" IS NOT NULL
  AND "fecha_inicio_vigencia" IS NOT NULL;
