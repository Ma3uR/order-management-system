/*
  Warnings:

  - You are about to drop the column `imageUrl` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the column `publishedDate` on the `Post` table. All the data in the column will be lost.
  - You are about to drop the `ContentPlan` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `subject` to the `Post` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `platform` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `status` on the `Post` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropForeignKey
ALTER TABLE "ContentPlan" DROP CONSTRAINT "ContentPlan_projectId_fkey";

-- AlterTable
ALTER TABLE "Post" DROP COLUMN "imageUrl",
DROP COLUMN "publishedDate",
ADD COLUMN     "subject" TEXT NOT NULL,
DROP COLUMN "platform",
ADD COLUMN     "platform" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" TEXT NOT NULL;

-- DropTable
DROP TABLE "ContentPlan";

-- DropEnum
DROP TYPE "Platform";

-- DropEnum
DROP TYPE "PostStatus";

-- CreateTable
CREATE TABLE "Order" (
    "id" SERIAL NOT NULL,
    "orderNumber" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "deliveryMethod" TEXT NOT NULL,
    "deliveryPostNumber" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "products" JSONB NOT NULL,
    "numberOfItems" INTEGER NOT NULL,
    "paymentMethod" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Blacklist" (
    "id" SERIAL NOT NULL,
    "fullName" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Blacklist_fullName_key" ON "Blacklist"("fullName");
