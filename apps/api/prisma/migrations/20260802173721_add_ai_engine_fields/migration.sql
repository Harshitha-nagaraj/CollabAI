-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'SUMMARIZED');

-- AlterTable
ALTER TABLE "Meeting" ADD COLUMN     "actionItems" TEXT,
ADD COLUMN     "decisions" TEXT,
ADD COLUMN     "risks" TEXT,
ADD COLUMN     "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "transcript" TEXT;

-- CreateTable
CREATE TABLE "AIInsight" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "workspaceId" UUID NOT NULL,
    "data" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIInsight_pkey" PRIMARY KEY ("id")
);
