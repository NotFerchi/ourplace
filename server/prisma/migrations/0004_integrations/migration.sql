-- Importación de tareas externas (aditivo: las tareas existentes quedan como MANUAL)
-- CreateEnum
CREATE TYPE "Source" AS ENUM ('MANUAL', 'CLICKUP', 'CLASSROOM', 'TEAMS');

-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('CLICKUP', 'CLASSROOM', 'TEAMS');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "source" "Source" NOT NULL DEFAULT 'MANUAL';

-- CreateTable
CREATE TABLE "Integration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "tokenEnc" TEXT NOT NULL,
    "refreshTokenEnc" TEXT,
    "expiresAt" TIMESTAMPTZ(3),
    "config" JSONB,
    "lastSyncAt" TIMESTAMPTZ(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Integration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Integration_userId_provider_key" ON "Integration"("userId", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "Task_userId_source_externalId_key" ON "Task"("userId", "source", "externalId");

-- AddForeignKey
ALTER TABLE "Integration" ADD CONSTRAINT "Integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

