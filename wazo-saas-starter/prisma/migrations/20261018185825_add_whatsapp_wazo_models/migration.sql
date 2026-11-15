-- CreateTable
CREATE TABLE "WaChannel" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "phoneNumberId" TEXT NOT NULL,
    "wabaId" TEXT NOT NULL,
    "displayNumber" TEXT,
    "tokenCiphertext" TEXT NOT NULL,
    "tokenIv" TEXT NOT NULL,
    "tokenTag" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaChannel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaDepartment" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "externalDepartmentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WaDepartment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaMember" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "wazoUserId" INTEGER NOT NULL,
    "departmentCode" TEXT,
    "phone" TEXT NOT NULL,
    "optedIn" BOOLEAN NOT NULL DEFAULT false,
    "optInAt" TIMESTAMP(3),
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WaMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaConversation" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "customerPhone" TEXT NOT NULL,
    "departmentCode" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SELECTING',
    "assignedWazoUserId" INTEGER,
    "customerWindowUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaInbound" (
    "id" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "conversationId" TEXT,
    "providerMessageId" TEXT NOT NULL,
    "senderPhone" TEXT NOT NULL,
    "messageText" TEXT,
    "payload" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WaInbound_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaNotification" (
    "id" TEXT NOT NULL,
    "inboundId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "providerId" TEXT,
    "error" TEXT,

    CONSTRAINT "WaNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WaChannel_phoneNumberId_key" ON "WaChannel"("phoneNumberId");

-- CreateIndex
CREATE INDEX "WaChannel_organizationId_idx" ON "WaChannel"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "WaDepartment_channelId_externalDepartmentId_key" ON "WaDepartment"("channelId", "externalDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "WaDepartment_channelId_code_key" ON "WaDepartment"("channelId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WaMember_channelId_wazoUserId_key" ON "WaMember"("channelId", "wazoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "WaMember_channelId_phone_key" ON "WaMember"("channelId", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "WaConversation_channelId_customerPhone_key" ON "WaConversation"("channelId", "customerPhone");

-- CreateIndex
CREATE INDEX "WaInbound_status_nextAttemptAt_idx" ON "WaInbound"("status", "nextAttemptAt");

-- CreateIndex
CREATE UNIQUE INDEX "WaInbound_channelId_providerMessageId_key" ON "WaInbound"("channelId", "providerMessageId");

-- CreateIndex
CREATE UNIQUE INDEX "WaNotification_inboundId_memberId_key" ON "WaNotification"("inboundId", "memberId");

-- AddForeignKey
ALTER TABLE "WaChannel" ADD CONSTRAINT "WaChannel_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaDepartment" ADD CONSTRAINT "WaDepartment_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WaChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaMember" ADD CONSTRAINT "WaMember_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WaChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaConversation" ADD CONSTRAINT "WaConversation_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WaChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaInbound" ADD CONSTRAINT "WaInbound_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES "WaChannel"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaInbound" ADD CONSTRAINT "WaInbound_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "WaConversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaNotification" ADD CONSTRAINT "WaNotification_inboundId_fkey" FOREIGN KEY ("inboundId") REFERENCES "WaInbound"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaNotification" ADD CONSTRAINT "WaNotification_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "WaMember"("id") ON DELETE CASCADE ON UPDATE CASCADE;
