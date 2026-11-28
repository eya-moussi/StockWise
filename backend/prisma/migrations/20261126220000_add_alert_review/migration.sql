CREATE TYPE "AlertStatus" AS ENUM ('TO_VERIFY', 'CONFIRMED', 'NORMAL');

ALTER TABLE "Alert"
ADD COLUMN "status" "AlertStatus" NOT NULL DEFAULT 'TO_VERIFY',
ADD COLUMN "comment" TEXT,
ADD COLUMN "processedById" INTEGER,
ADD COLUMN "processedAt" TIMESTAMP(3);

CREATE INDEX "Alert_status_idx" ON "Alert"("status");
CREATE INDEX "Alert_processedById_idx" ON "Alert"("processedById");

ALTER TABLE "Alert" ADD CONSTRAINT "Alert_processedById_fkey" FOREIGN KEY ("processedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
