-- CreateEnum
CREATE TYPE "Category" AS ENUM ('ESCUELA', 'PROYECTO', 'PERSONAL');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "BlockType" AS ENUM ('CLASE', 'ESTUDIO', 'GYM', 'DESARROLLO', 'OTRO');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'PERSONAL',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIA',
    "dueAt" TIMESTAMPTZ(3) NOT NULL,
    "dueHasTime" BOOLEAN NOT NULL DEFAULT false,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMPTZ(3),
    "notifiedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Block" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "BlockType" NOT NULL DEFAULT 'OTRO',
    "date" VARCHAR(10) NOT NULL,
    "weekday" SMALLINT NOT NULL,
    "startMin" SMALLINT NOT NULL,
    "endMin" SMALLINT NOT NULL,
    "repeatWeekly" BOOLEAN NOT NULL DEFAULT false,
    "notifiedOn" VARCHAR(10),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Task_userId_done_dueAt_idx" ON "Task"("userId", "done", "dueAt");

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "Task"("category");

-- CreateIndex
CREATE INDEX "Block_userId_date_idx" ON "Block"("userId", "date");

-- CreateIndex
CREATE INDEX "Block_repeatWeekly_weekday_idx" ON "Block"("repeatWeekly", "weekday");

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
