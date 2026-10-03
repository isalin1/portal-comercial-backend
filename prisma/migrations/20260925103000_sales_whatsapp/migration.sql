CREATE TABLE "app_settings" (
  "id" INTEGER NOT NULL DEFAULT 1,
  "whatsapp_planes" TEXT NOT NULL DEFAULT '940485657',
  CONSTRAINT "app_settings_pkey" PRIMARY KEY ("id")
);

INSERT INTO "app_settings" ("id", "whatsapp_planes") VALUES (1, '940485657');
