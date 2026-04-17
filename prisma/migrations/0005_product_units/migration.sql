-- Add unit field to Product
ALTER TABLE "Product" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'piece';

-- Add unit snapshot to SaleItem
ALTER TABLE "SaleItem" ADD COLUMN "unit" TEXT NOT NULL DEFAULT 'piece';
