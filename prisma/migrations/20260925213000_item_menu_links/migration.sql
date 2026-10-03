CREATE TABLE "item_menu_offers" (
    "item_id" INTEGER NOT NULL,
    "menu_offer_id" INTEGER NOT NULL,
    CONSTRAINT "item_menu_offers_pkey" PRIMARY KEY ("item_id","menu_offer_id")
);

ALTER TABLE "item_menu_offers" ADD CONSTRAINT "item_menu_offers_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "item_menu_offers" ADD CONSTRAINT "item_menu_offers_menu_offer_id_fkey" FOREIGN KEY ("menu_offer_id") REFERENCES "menu_offers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "item_menu_offers" ("item_id", "menu_offer_id")
SELECT "id", "menu_offer_id" FROM "items" WHERE "menu_offer_id" IS NOT NULL;
