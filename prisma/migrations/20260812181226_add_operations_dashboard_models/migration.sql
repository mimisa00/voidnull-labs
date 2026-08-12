-- CreateTable
CREATE TABLE "CageAsset" (
    "id" TEXT NOT NULL,
    "branchId" TEXT,
    "assetType" TEXT NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CageAsset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalLog" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actedBy" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentPerformance" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "commissionEarned" DECIMAL(18,2) NOT NULL,
    "customerCount" INTEGER NOT NULL DEFAULT 0,
    "period" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CageAsset_branchId_idx" ON "CageAsset"("branchId");

-- CreateIndex
CREATE INDEX "ApprovalLog_targetType_action_idx" ON "ApprovalLog"("targetType", "action");

-- CreateIndex
CREATE INDEX "ApprovalLog_createdAt_idx" ON "ApprovalLog"("createdAt");

-- CreateIndex
CREATE INDEX "AgentPerformance_period_idx" ON "AgentPerformance"("period");

-- CreateIndex
CREATE UNIQUE INDEX "AgentPerformance_agentId_period_key" ON "AgentPerformance"("agentId", "period");

-- AddForeignKey
ALTER TABLE "AgentPerformance" ADD CONSTRAINT "AgentPerformance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
