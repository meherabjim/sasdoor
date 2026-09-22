-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'USER');

-- CreateEnum
CREATE TYPE "SourceType" AS ENUM ('LOCAL', 'FOREIGN');

-- CreateEnum
CREATE TYPE "WoodUse" AS ENUM ('DOOR', 'FRAME', 'BOTH');

-- CreateEnum
CREATE TYPE "DoorType" AS ENUM ('SINGLE', 'DOUBLE');

-- CreateEnum
CREATE TYPE "ColorType" AS ENUM ('DOOR', 'DESIGN');

-- CreateEnum
CREATE TYPE "LabourCategory" AS ENUM ('DOOR', 'POLISH', 'FRAME', 'FITTING', 'DELIVERY', 'OTHER');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('ACTIVE', 'WAITING', 'DONE');

-- CreateEnum
CREATE TYPE "EstimateStatus" AS ENUM ('NEW', 'CONFIRMED', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EstimateSource" AS ENUM ('ADMIN', 'WEBSITE');

-- CreateEnum
CREATE TYPE "LineType" AS ENUM ('WOOD', 'DOOR_COLOR', 'DESIGN', 'DESIGN_COLOR', 'LABOUR');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'BANK', 'BKASH', 'NAGAD', 'LC', 'OTHER');

-- CreateEnum
CREATE TYPE "PriceItemType" AS ENUM ('WOOD_STOCK', 'WOOD_MARKET', 'COLOR', 'DESIGN', 'DESIGN_LABOUR', 'LABOUR');

-- CreateEnum
CREATE TYPE "RequestStatus" AS ENUM ('NEW', 'CONTACTED', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "address" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "note" TEXT,
    "userId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "doorThicknessInch" DECIMAL(6,2) NOT NULL DEFAULT 1.5,
    "frameWidthInch" DECIMAL(6,2) NOT NULL DEFAULT 5,
    "frameThicknessInch" DECIMAL(6,2) NOT NULL DEFAULT 2.5,
    "wastagePercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "minHeightFt" DECIMAL(6,2) NOT NULL DEFAULT 5,
    "maxHeightFt" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "singleMinWidthFt" DECIMAL(6,2) NOT NULL DEFAULT 2,
    "singleMaxWidthFt" DECIMAL(6,2) NOT NULL DEFAULT 4.5,
    "doubleMinWidthFt" DECIMAL(6,2) NOT NULL DEFAULT 4,
    "doubleMaxWidthFt" DECIMAL(6,2) NOT NULL DEFAULT 8,
    "bigDoorSqftPerLeaf" DECIMAL(8,2) NOT NULL DEFAULT 24,
    "bigDoorExtraPercent" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "profitWoodPercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "profitColorPercent" DECIMAL(6,2) NOT NULL DEFAULT 25,
    "profitDesignPercent" DECIMAL(6,2) NOT NULL DEFAULT 25,
    "profitLabourPercent" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "companyName" TEXT NOT NULL DEFAULT 'SAS DOOR',
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "companyLogo" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WoodType" (
    "id" SERIAL NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "source" "SourceType" NOT NULL,
    "countries" TEXT[],
    "use" "WoodUse" NOT NULL DEFAULT 'BOTH',
    "marketPricePerCft" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WoodType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "companyName" TEXT NOT NULL,
    "phone" TEXT,
    "address" TEXT,
    "source" "SourceType" NOT NULL DEFAULT 'LOCAL',
    "country" TEXT NOT NULL DEFAULT 'Bangladesh',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WoodPurchase" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER,
    "woodTypeId" INTEGER NOT NULL,
    "source" "SourceType" NOT NULL,
    "country" TEXT NOT NULL,
    "isOpeningStock" BOOLEAN NOT NULL DEFAULT false,
    "invoiceNo" TEXT,
    "lcNo" TEXT,
    "purchaseDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "quantityCft" DECIMAL(12,3) NOT NULL,
    "pricePerCft" DECIMAL(12,2) NOT NULL,
    "woodCost" DECIMAL(14,2) NOT NULL,
    "transportCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "otherCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "costPerCft" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "paymentMethod" "PaymentMethod",
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WoodPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierPayment" (
    "id" SERIAL NOT NULL,
    "supplierId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplierPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WoodStock" (
    "id" SERIAL NOT NULL,
    "woodTypeId" INTEGER NOT NULL,
    "source" "SourceType" NOT NULL,
    "profitPercent" DECIMAL(6,2) NOT NULL DEFAULT 10,
    "activeCostPerCft" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellingPricePerCft" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WoodStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" SERIAL NOT NULL,
    "woodStockId" INTEGER NOT NULL,
    "purchaseId" INTEGER,
    "country" TEXT NOT NULL,
    "quantityCft" DECIMAL(12,3) NOT NULL,
    "remainingCft" DECIMAL(12,3) NOT NULL,
    "originalCost" DECIMAL(12,2) NOT NULL,
    "currentCost" DECIMAL(12,2) NOT NULL,
    "status" "BatchStatus" NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockUsage" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "batchId" INTEGER NOT NULL,
    "cft" DECIMAL(12,3) NOT NULL,
    "originalCost" DECIMAL(12,2) NOT NULL,
    "returned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Color" (
    "id" SERIAL NOT NULL,
    "type" "ColorType" NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "colorCode" TEXT NOT NULL,
    "isToneOnTone" BOOLEAN NOT NULL DEFAULT false,
    "costSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitPercent" DECIMAL(6,2) NOT NULL DEFAULT 25,
    "sellSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "suggestions" TEXT[],
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Color_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoorDesign" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "noteEn" TEXT,
    "noteBn" TEXT,
    "svgUrl" TEXT,
    "allowDouble" BOOLEAN NOT NULL DEFAULT true,
    "costSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitPercent" DECIMAL(6,2) NOT NULL DEFAULT 25,
    "sellSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labourCostSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labourCostDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labourProfitPercent" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "labourSellSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "labourSellDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoorDesign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourRate" (
    "id" SERIAL NOT NULL,
    "nameEn" TEXT NOT NULL,
    "nameBn" TEXT NOT NULL,
    "category" "LabourCategory" NOT NULL,
    "costSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "costDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "profitPercent" DECIMAL(6,2) NOT NULL DEFAULT 20,
    "sellSingle" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sellDouble" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabourRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceHistory" (
    "id" SERIAL NOT NULL,
    "itemType" "PriceItemType" NOT NULL,
    "itemId" INTEGER NOT NULL,
    "itemName" TEXT NOT NULL,
    "oldCost" DECIMAL(12,2),
    "newCost" DECIMAL(12,2),
    "oldSell" DECIMAL(12,2),
    "newSell" DECIMAL(12,2),
    "note" TEXT,
    "changedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Estimate" (
    "id" SERIAL NOT NULL,
    "estimateNo" TEXT NOT NULL,
    "customerId" INTEGER NOT NULL,
    "createdById" INTEGER,
    "source" "EstimateSource" NOT NULL DEFAULT 'ADMIN',
    "status" "EstimateStatus" NOT NULL DEFAULT 'NEW',
    "doorType" "DoorType" NOT NULL,
    "heightFt" DECIMAL(6,2) NOT NULL,
    "widthFt" DECIMAL(6,2) NOT NULL,
    "thicknessInch" DECIMAL(6,2) NOT NULL,
    "withFrame" BOOLEAN NOT NULL DEFAULT false,
    "withFitting" BOOLEAN NOT NULL DEFAULT false,
    "withDelivery" BOOLEAN NOT NULL DEFAULT false,
    "woodStockId" INTEGER NOT NULL,
    "woodName" TEXT NOT NULL,
    "doorColorId" INTEGER,
    "doorColorName" TEXT,
    "doorColorCode" TEXT,
    "designId" INTEGER,
    "designKey" TEXT,
    "designName" TEXT,
    "designColorId" INTEGER,
    "designColorName" TEXT,
    "designColorCode" TEXT,
    "doorCft" DECIMAL(10,3) NOT NULL,
    "frameCft" DECIMAL(10,3) NOT NULL,
    "totalCft" DECIMAL(10,3) NOT NULL,
    "totalCost" DECIMAL(14,2) NOT NULL,
    "totalSell" DECIMAL(14,2) NOT NULL,
    "discount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "grandTotal" DECIMAL(14,2) NOT NULL,
    "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "note" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Estimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimateLine" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "type" "LineType" NOT NULL,
    "name" TEXT NOT NULL,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 1,
    "unitCost" DECIMAL(12,2) NOT NULL,
    "unitSell" DECIMAL(12,2) NOT NULL,
    "cost" DECIMAL(14,2) NOT NULL,
    "sell" DECIMAL(14,2) NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "EstimateLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EstimatePayment" (
    "id" SERIAL NOT NULL,
    "estimateId" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstimatePayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteContent" (
    "id" SERIAL NOT NULL,
    "page" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "textEn" TEXT,
    "textBn" TEXT,
    "image" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteContent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookVisitRequest" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "preferredDate" TIMESTAMP(3),
    "note" TEXT,
    "customerId" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookVisitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_phone_key" ON "Customer"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_userId_key" ON "Customer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WoodType_nameEn_source_key" ON "WoodType"("nameEn", "source");

-- CreateIndex
CREATE UNIQUE INDEX "WoodStock_woodTypeId_source_key" ON "WoodStock"("woodTypeId", "source");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_purchaseId_key" ON "StockBatch"("purchaseId");

-- CreateIndex
CREATE UNIQUE INDEX "Color_type_nameEn_key" ON "Color"("type", "nameEn");

-- CreateIndex
CREATE UNIQUE INDEX "DoorDesign_key_key" ON "DoorDesign"("key");

-- CreateIndex
CREATE INDEX "PriceHistory_itemType_itemId_idx" ON "PriceHistory"("itemType", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Estimate_estimateNo_key" ON "Estimate"("estimateNo");

-- CreateIndex
CREATE UNIQUE INDEX "SiteContent_page_section_key_key" ON "SiteContent"("page", "section", "key");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WoodPurchase" ADD CONSTRAINT "WoodPurchase_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WoodPurchase" ADD CONSTRAINT "WoodPurchase_woodTypeId_fkey" FOREIGN KEY ("woodTypeId") REFERENCES "WoodType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierPayment" ADD CONSTRAINT "SupplierPayment_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WoodStock" ADD CONSTRAINT "WoodStock_woodTypeId_fkey" FOREIGN KEY ("woodTypeId") REFERENCES "WoodType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_woodStockId_fkey" FOREIGN KEY ("woodStockId") REFERENCES "WoodStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_purchaseId_fkey" FOREIGN KEY ("purchaseId") REFERENCES "WoodPurchase"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockUsage" ADD CONSTRAINT "StockUsage_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockUsage" ADD CONSTRAINT "StockUsage_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "StockBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Estimate" ADD CONSTRAINT "Estimate_woodStockId_fkey" FOREIGN KEY ("woodStockId") REFERENCES "WoodStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimateLine" ADD CONSTRAINT "EstimateLine_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EstimatePayment" ADD CONSTRAINT "EstimatePayment_estimateId_fkey" FOREIGN KEY ("estimateId") REFERENCES "Estimate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookVisitRequest" ADD CONSTRAINT "BookVisitRequest_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
