-- CreateTable
CREATE TABLE "FoodItemRelationAlternative" (
    "id" SERIAL NOT NULL,
    "relationId" INTEGER NOT NULL,
    "replacementFoodItemId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodItemRelationAlternative_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "FoodItemRelationAlternative" ADD CONSTRAINT "FoodItemRelationAlternative_relationId_fkey" FOREIGN KEY ("relationId") REFERENCES "FoodItemRelation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodItemRelationAlternative" ADD CONSTRAINT "FoodItemRelationAlternative_replacementFoodItemId_fkey" FOREIGN KEY ("replacementFoodItemId") REFERENCES "FoodItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
