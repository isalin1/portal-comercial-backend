/*
  Warnings:

  - You are about to drop the column `pointsaleId` on the `listservices` table. All the data in the column will be lost.
  - You are about to drop the column `price` on the `listservices` table. All the data in the column will be lost.
  - Added the required column `basePrice` to the `listservices` table without a default value. This is not possible if the table is not empty.
  - Added the required column `businesId` to the `servicecategories` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."listservices" DROP CONSTRAINT "listservices_pointsaleId_fkey";

-- AlterTable
ALTER TABLE "public"."listservices" DROP COLUMN "pointsaleId",
DROP COLUMN "price",
ADD COLUMN     "basePrice" DECIMAL(65,30) NOT NULL;

-- AlterTable
ALTER TABLE "public"."servicecategories" ADD COLUMN     "businesId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "public"."pointsaleservices" (
    "id" SERIAL NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "listserviceId" INTEGER NOT NULL,
    "pointsaleId" INTEGER NOT NULL,

    CONSTRAINT "pointsaleservices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "pointsaleservices_listserviceId_pointsaleId_key" ON "public"."pointsaleservices"("listserviceId", "pointsaleId");

-- AddForeignKey
ALTER TABLE "public"."servicecategories" ADD CONSTRAINT "servicecategories_businesId_fkey" FOREIGN KEY ("businesId") REFERENCES "public"."business"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pointsaleservices" ADD CONSTRAINT "pointsaleservices_listserviceId_fkey" FOREIGN KEY ("listserviceId") REFERENCES "public"."listservices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pointsaleservices" ADD CONSTRAINT "pointsaleservices_pointsaleId_fkey" FOREIGN KEY ("pointsaleId") REFERENCES "public"."pointsales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
