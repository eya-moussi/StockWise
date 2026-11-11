-- Add nullable authorship so existing and seeded movements remain valid.
ALTER TABLE "StockMovement" ADD COLUMN "createdById" INTEGER;

CREATE INDEX "StockMovement_createdById_idx" ON "StockMovement"("createdById");

ALTER TABLE "StockMovement"
ADD CONSTRAINT "StockMovement_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;