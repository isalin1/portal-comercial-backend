-- CreateEnum
CREATE TYPE "TimeUnit" AS ENUM ('MONTHS', 'YEARS');

-- AlterTable
ALTER TABLE "simulations" ADD COLUMN     "timeunit" "TimeUnit" NOT NULL DEFAULT 'MONTHS';
