-- CreateTable
CREATE TABLE "Person" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Restriction" (
    "id" SERIAL NOT NULL,
    "svName" TEXT NOT NULL,
    "enName" TEXT,
    "svDescription" TEXT,
    "enDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Restriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonRestriction" (
    "id" SERIAL NOT NULL,
    "personId" INTEGER NOT NULL,
    "restrictionId" INTEGER NOT NULL,
    "airborne" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonRestriction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_FoodItemToRestriction" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_FoodItemToRestriction_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_FoodItemToRestriction_B_index" ON "_FoodItemToRestriction"("B");

-- AddForeignKey
ALTER TABLE "PersonRestriction" ADD CONSTRAINT "PersonRestriction_personId_fkey" FOREIGN KEY ("personId") REFERENCES "Person"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonRestriction" ADD CONSTRAINT "PersonRestriction_restrictionId_fkey" FOREIGN KEY ("restrictionId") REFERENCES "Restriction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodItemToRestriction" ADD CONSTRAINT "_FoodItemToRestriction_A_fkey" FOREIGN KEY ("A") REFERENCES "FoodItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_FoodItemToRestriction" ADD CONSTRAINT "_FoodItemToRestriction_B_fkey" FOREIGN KEY ("B") REFERENCES "Restriction"("id") ON DELETE CASCADE ON UPDATE CASCADE;
