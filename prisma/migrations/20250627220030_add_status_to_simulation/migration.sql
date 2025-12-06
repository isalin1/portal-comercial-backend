-- CreateEnum
CREATE TYPE "SimulationStatus" AS ENUM ('IN_PROGRESS', 'FINALIZED', 'CANCELED');

-- AlterTable
ALTER TABLE "simulations" ADD COLUMN     "status" "SimulationStatus" NOT NULL DEFAULT 'IN_PROGRESS';
