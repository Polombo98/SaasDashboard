-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('SIGNUP', 'SUBSCRIPTION_START', 'SUBSCRIPTION_CANCEL', 'REVENUE', 'ACTIVE');

-- CreateTable
CREATE TABLE "MetricEvent" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "type" "MetricType" NOT NULL,
    "value" DOUBLE PRECISION,
    "userId" TEXT,
    "eventId" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetricEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MetricEvent_projectId_occurredAt_idx" ON "MetricEvent"("projectId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "MetricEvent_projectId_eventId_key" ON "MetricEvent"("projectId", "eventId");

-- AddForeignKey
ALTER TABLE "MetricEvent" ADD CONSTRAINT "MetricEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
