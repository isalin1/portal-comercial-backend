ALTER TABLE "items" ADD COLUMN "menu_offer_id" INTEGER;

ALTER TABLE "items" ADD CONSTRAINT "items_menu_offer_id_fkey" FOREIGN KEY ("menu_offer_id") REFERENCES "menu_offers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
