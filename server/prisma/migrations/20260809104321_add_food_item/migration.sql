-- CreateEnum
CREATE TYPE "FoodItemType" AS ENUM ('NORMAL', 'PROPERTY');

-- CreateEnum
CREATE TYPE "FoodItemRelationType" AS ENUM ('CONTAINS', 'IS_A');

-- CreateTable
CREATE TABLE "FoodItem" (
    "id" SERIAL NOT NULL,
    "type" "FoodItemType" NOT NULL,
    "svName" TEXT NOT NULL,
    "enName" TEXT,
    "svDescription" TEXT,
    "enDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodItemRelation" (
    "id" SERIAL NOT NULL,
    "fromId" INTEGER NOT NULL,
    "toId" INTEGER NOT NULL,
    "relationType" "FoodItemRelationType" NOT NULL,
    "optional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItemRelation_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FoodItemRelation" ADD CONSTRAINT "FoodItemRelation_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItemRelation" ADD CONSTRAINT "FoodItemRelation_toId_fkey" FOREIGN KEY ("toId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
