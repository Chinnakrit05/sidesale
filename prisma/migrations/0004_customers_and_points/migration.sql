-- CreateTable Customer
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "email" TEXT,
    "points" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "visitCount" INTEGER NOT NULL DEFAULT 0,
    "note" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_code_key" ON "Customer"("code");
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");
CREATE INDEX "Customer_name_idx" ON "Customer"("name");
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateTable PointHistory
CREATE TABLE "PointHistory" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "saleId" TEXT,
    "change" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PointHistory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PointHistory_customerId_idx" ON "PointHistory"("customerId");
CREATE INDEX "PointHistory_createdAt_idx" ON "PointHistory"("createdAt");

ALTER TABLE "PointHistory" ADD CONSTRAINT "PointHistory_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable Sale: add customer and points
ALTER TABLE "Sale" ADD COLUMN "customerId" TEXT;
ALTER TABLE "Sale" ADD COLUMN "pointsEarned" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "Sale_customerId_idx" ON "Sale"("customerId");
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable Settings: add points config
ALTER TABLE "Settings" ADD COLUMN "pointsPerBaht" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Settings" ADD COLUMN "pointValue" DECIMAL(8,2) NOT NULL DEFAULT 0.25;
ALTER TABLE "Settings" ADD COLUMN "minPointsRedeem" INTEGER NOT NULL DEFAULT 100;
