/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `departments` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `districts` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[programname]` on the table `programs` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `provinces` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[name]` on the table `teas` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "departments_name_key" ON "departments"("name");

-- CreateIndex
CREATE UNIQUE INDEX "districts_name_key" ON "districts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "programs_programname_key" ON "programs"("programname");

-- CreateIndex
CREATE UNIQUE INDEX "provinces_name_key" ON "provinces"("name");

-- CreateIndex
CREATE UNIQUE INDEX "teas_name_key" ON "teas"("name");
