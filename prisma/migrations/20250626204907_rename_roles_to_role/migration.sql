/*
  Warnings:

  - You are about to drop the column `roles` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "LotStatus" AS ENUM ('AVALIABLE', 'ASSIGNED');

-- CreateEnum
CREATE TYPE "Roles" AS ENUM ('ADMIN', 'COLABORADOR', 'CLIENT', 'SUPERADMIN');

-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('VOLANTES', 'FACEBOOK', 'TIKTOK', 'REFERIDOS');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "roles",
ADD COLUMN     "role" "Roles" NOT NULL DEFAULT 'CLIENT';

-- CreateTable
CREATE TABLE "clients" (
    "id" SERIAL NOT NULL,
    "firstname" TEXT NOT NULL,
    "lastname" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teas" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "teaValue" DECIMAL(65,30) NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" SERIAL NOT NULL,
    "programname" TEXT NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "districtId" INTEGER NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lots" (
    "id" SERIAL NOT NULL,
    "lotCode" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "area" DECIMAL(65,30) NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "lotstatus" "LotStatus",
    "programId" INTEGER NOT NULL,

    CONSTRAINT "lots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "simulations" (
    "id" SERIAL NOT NULL,
    "initialquote" DECIMAL(65,30) NOT NULL,
    "numquotas" INTEGER NOT NULL,
    "contactType" "ContactType" NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "userId" INTEGER NOT NULL,
    "clientId" INTEGER NOT NULL,
    "teaId" INTEGER NOT NULL,
    "lotId" INTEGER NOT NULL,

    CONSTRAINT "simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quotations" (
    "id" SERIAL NOT NULL,
    "initialquote" DECIMAL(65,30) NOT NULL,
    "numquotas" INTEGER NOT NULL,
    "contactType" "ContactType" NOT NULL,
    "created_At" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_At" TIMESTAMP(3) NOT NULL,
    "simulationId" INTEGER NOT NULL,

    CONSTRAINT "quotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quotations_simulationId_key" ON "quotations"("simulationId");

-- AddForeignKey
ALTER TABLE "programs" ADD CONSTRAINT "programs_districtId_fkey" FOREIGN KEY ("districtId") REFERENCES "districts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lots" ADD CONSTRAINT "lots_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_teaId_fkey" FOREIGN KEY ("teaId") REFERENCES "teas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "simulations" ADD CONSTRAINT "simulations_lotId_fkey" FOREIGN KEY ("lotId") REFERENCES "lots"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "simulations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
