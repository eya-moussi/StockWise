-- CreateTable
CREATE TABLE "Alert" (
    "id" SERIAL NOT NULL,
    "movementId" INTEGER NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "threshold" DOUBLE PRECISION NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Alert_movementId_key" ON "Alert"("movementId");

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "StockMovement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
