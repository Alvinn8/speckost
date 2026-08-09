/*
  Warnings:

  - The values [PROPERTY] on the enum `FoodItemType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "FoodItemType_new" AS ENUM ('NORMAL', 'CATEGORY');
ALTER TABLE "FoodItem" ALTER COLUMN "type" TYPE "FoodItemType_new" USING ("type"::text::"FoodItemType_new");
ALTER TYPE "FoodItemType" RENAME TO "FoodItemType_old";
ALTER TYPE "FoodItemType_new" RENAME TO "FoodItemType";
DROP TYPE "public"."FoodItemType_old";
COMMIT;
