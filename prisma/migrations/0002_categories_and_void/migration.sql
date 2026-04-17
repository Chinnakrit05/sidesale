-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'VOID_RETURN';

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE INDEX "Category_sortOrder_idx" ON "Category"("sortOrder");

-- AlterTable Product: add categoryId
ALTER TABLE "Product" ADD COLUMN "categoryId" TEXT;
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Sale: add void fields
ALTER TABLE "Sale" ADD COLUMN "voidReason" TEXT;
ALTER TABLE "Sale" ADD COLUMN "voidAt" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN "voidById" TEXT;
