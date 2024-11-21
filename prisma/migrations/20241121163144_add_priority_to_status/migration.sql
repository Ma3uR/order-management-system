/*
  Warnings:

  - You are about to drop the column `reason` on the `Blacklist` table. All the data in the column will be lost.
  - Added the required column `phoneNumber` to the `Blacklist` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Blacklist_fullName_key";

-- AlterTable
ALTER TABLE "Blacklist" DROP COLUMN "reason",
ADD COLUMN     "phoneNumber" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Status" ADD COLUMN     "priority" INTEGER NOT NULL DEFAULT 0;
