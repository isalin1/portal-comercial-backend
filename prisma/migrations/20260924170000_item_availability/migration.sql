CREATE TABLE "item_availability" (
    "id" SERIAL NOT NULL,
    "day" DATE NOT NULL,
    "item_id" INTEGER NOT NULL,
    CONSTRAINT "item_availability_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "item_availability_item_id_day_key" ON "item_availability"("item_id", "day");

ALTER TABLE "item_availability" ADD CONSTRAINT "item_availability_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
