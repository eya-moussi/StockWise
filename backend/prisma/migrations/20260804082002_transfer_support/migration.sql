/*
  Warnings:

  - The values [ADJUSTMENT] on the enum `StockMovementType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "StockMovementType_new" AS ENUM ('IN', 'OUT', 'TRANSFER', 'RETURN_CLIENT', 'RETURN_SUPPLIER', 'CORRECTION');
ALTER TABLE "StockMovement" ALTER COLUMN "type" TYPE "StockMovementType_new" USING ("type"::text::"StockMovementType_new");
ALTER TYPE "StockMovementType" RENAME TO "StockMovementType_old";
ALTER TYPE "StockMovementType_new" RENAME TO "StockMovementType";
DROP TYPE "public"."StockMovementType_old";
COMMIT;

-- AlterTable
ALTER TABLE "StockMovement" ADD COLUMN     "reason" TEXT,
ADD COLUMN     "relatedMovementId" INTEGER;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_relatedMovementId_fkey" FOREIGN KEY ("relatedMovementId") REFERENCES "StockMovement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
