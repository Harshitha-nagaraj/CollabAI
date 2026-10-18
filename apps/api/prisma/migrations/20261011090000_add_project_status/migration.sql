-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('PLANNING', 'IN_PROGRESS', 'COMPLETED', 'ON_HOLD', 'CANCELLED');

-- AlterTable
ALTER TABLE "Project" ADD COLUMN "status" "ProjectStatus" NOT NULL DEFAULT 'PLANNING';
