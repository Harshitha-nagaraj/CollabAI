-- DropForeignKey
ALTER TABLE "CommitRecord" DROP CONSTRAINT "CommitRecord_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "CommitRecord" DROP CONSTRAINT "CommitRecord_taskId_fkey";

-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_projectId_fkey";

-- DropForeignKey
ALTER TABLE "Milestone" DROP CONSTRAINT "Milestone_releaseId_fkey";

-- DropForeignKey
ALTER TABLE "ProjectRetrospective" DROP CONSTRAINT "ProjectRetrospective_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "PullRequest" DROP CONSTRAINT "PullRequest_repositoryId_fkey";

-- DropForeignKey
ALTER TABLE "ReleaseMetrics" DROP CONSTRAINT "ReleaseMetrics_releaseId_fkey";

-- DropForeignKey
ALTER TABLE "SimulationScenario" DROP CONSTRAINT "SimulationScenario_creatorId_fkey";

-- DropForeignKey
ALTER TABLE "SprintMetrics" DROP CONSTRAINT "SprintMetrics_sprintId_fkey";

-- DropForeignKey
ALTER TABLE "SprintRetrospective" DROP CONSTRAINT "SprintRetrospective_creatorId_fkey";

-- DropIndex
DROP INDEX "ExecutiveReport_shareToken_key";

-- DropIndex
DROP INDEX "SprintTask_sprintId_taskId_key";

-- DropIndex
DROP INDEX "TaskDependency_predecessorId_successorId_key";

-- AlterTable
ALTER TABLE "CommitRecord" DROP COLUMN "repositoryId",
DROP COLUMN "taskId",
ADD COLUMN     "author" TEXT NOT NULL,
ADD COLUMN     "pullRequestId" UUID,
ADD COLUMN     "repoId" UUID NOT NULL,
ALTER COLUMN "authorName" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Decision" ADD COLUMN     "context" TEXT,
ADD COLUMN     "decision" TEXT,
ALTER COLUMN "description" DROP NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "Document" DROP COLUMN "type",
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "ExecutiveRecommendation" DROP COLUMN "actionPayload",
ADD COLUMN     "effort" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "impact" DROP NOT NULL,
ALTER COLUMN "impact" DROP DEFAULT,
ALTER COLUMN "status" SET DEFAULT 'OPEN';

-- AlterTable
ALTER TABLE "ExecutiveReport" ADD COLUMN     "data" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "format" DROP NOT NULL,
ALTER COLUMN "format" DROP DEFAULT,
ALTER COLUMN "content" DROP NOT NULL;

-- AlterTable
ALTER TABLE "GitHubRepository" ALTER COLUMN "owner" DROP NOT NULL,
ALTER COLUMN "fullName" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "progress" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'IN_PROGRESS';

-- AlterTable
ALTER TABLE "KnowledgeItem" DROP COLUMN "sourceId",
ADD COLUMN     "category" TEXT,
ALTER COLUMN "type" DROP NOT NULL,
ALTER COLUMN "type" DROP DEFAULT,
ALTER COLUMN "tags" DROP NOT NULL,
ALTER COLUMN "tags" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "LearningPattern" ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "confidenceScore" DROP NOT NULL,
ALTER COLUMN "confidenceScore" DROP DEFAULT,
ALTER COLUMN "occurrences" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Meeting" DROP COLUMN "type",
ADD COLUMN     "type" TEXT;

-- AlterTable
ALTER TABLE "MeetingParticipant" DROP COLUMN "attended";

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "ProjectRetrospective" DROP COLUMN "updatedAt",
ADD COLUMN     "learnings" TEXT,
ALTER COLUMN "workspaceId" DROP NOT NULL,
ALTER COLUMN "creatorId" DROP NOT NULL,
ALTER COLUMN "whatWentWell" DROP NOT NULL,
ALTER COLUMN "whatWentWell" SET DATA TYPE TEXT,
ALTER COLUMN "whatCausedDelays" DROP NOT NULL,
ALTER COLUMN "whatCausedDelays" SET DATA TYPE TEXT,
ALTER COLUMN "biggestBlockers" DROP NOT NULL,
ALTER COLUMN "biggestBlockers" SET DATA TYPE TEXT,
ALTER COLUMN "teamAchievements" DROP NOT NULL,
ALTER COLUMN "teamAchievements" SET DATA TYPE TEXT,
ALTER COLUMN "lessonsLearned" DROP NOT NULL,
ALTER COLUMN "lessonsLearned" SET DATA TYPE TEXT,
ALTER COLUMN "futureRecommendations" DROP NOT NULL,
ALTER COLUMN "futureRecommendations" SET DATA TYPE TEXT,
ALTER COLUMN "status" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ProjectTemplate" ADD COLUMN     "structure" TEXT NOT NULL,
ALTER COLUMN "category" DROP NOT NULL,
ALTER COLUMN "category" DROP DEFAULT,
ALTER COLUMN "tasks" DROP NOT NULL,
ALTER COLUMN "tasks" SET DATA TYPE TEXT,
ALTER COLUMN "tags" DROP NOT NULL,
ALTER COLUMN "tags" SET DATA TYPE TEXT,
DROP COLUMN "sourceProjectId",
ADD COLUMN     "sourceProjectId" UUID;

-- AlterTable
ALTER TABLE "PullRequest" DROP COLUMN "repositoryId",
ADD COLUMN     "prNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "repoId" UUID NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'OPEN',
ALTER COLUMN "number" DROP NOT NULL,
ALTER COLUMN "state" DROP NOT NULL,
ALTER COLUMN "state" DROP DEFAULT,
ALTER COLUMN "headBranch" DROP NOT NULL,
ALTER COLUMN "baseBranch" DROP NOT NULL,
ALTER COLUMN "url" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Release" DROP COLUMN "actualDate",
ALTER COLUMN "confidenceScore" DROP NOT NULL,
ALTER COLUMN "confidenceScore" DROP DEFAULT;

-- AlterTable
ALTER TABLE "ReleaseNote" DROP COLUMN "updatedAt",
ADD COLUMN     "releaseId" UUID,
ALTER COLUMN "version" DROP NOT NULL,
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "workspaceId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SimulationScenario" ADD COLUMN     "parameters" TEXT,
ADD COLUMN     "results" TEXT,
ALTER COLUMN "creatorId" DROP NOT NULL,
ALTER COLUMN "modifications" DROP NOT NULL,
ALTER COLUMN "modifications" SET DATA TYPE TEXT,
ALTER COLUMN "result" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "Sprint" DROP COLUMN "completionPercentage",
ALTER COLUMN "durationDays" DROP NOT NULL,
ALTER COLUMN "durationDays" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SprintRetrospective" DROP COLUMN "updatedAt",
ADD COLUMN     "learnings" TEXT,
ADD COLUMN     "sprintId" UUID,
ADD COLUMN     "summary" TEXT,
ALTER COLUMN "sprintName" DROP NOT NULL,
ALTER COLUMN "workspaceId" DROP NOT NULL,
ALTER COLUMN "creatorId" DROP NOT NULL,
ALTER COLUMN "completedWork" DROP NOT NULL,
ALTER COLUMN "completedWork" SET DATA TYPE TEXT,
ALTER COLUMN "missedGoals" DROP NOT NULL,
ALTER COLUMN "missedGoals" SET DATA TYPE TEXT,
ALTER COLUMN "unexpectedIssues" DROP NOT NULL,
ALTER COLUMN "unexpectedIssues" SET DATA TYPE TEXT,
ALTER COLUMN "successFactors" DROP NOT NULL,
ALTER COLUMN "successFactors" SET DATA TYPE TEXT,
ALTER COLUMN "improvementSuggestions" DROP NOT NULL,
ALTER COLUMN "improvementSuggestions" SET DATA TYPE TEXT,
ALTER COLUMN "actionItems" DROP NOT NULL,
ALTER COLUMN "actionItems" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "SprintTask" DROP COLUMN "selectionReason",
DROP COLUMN "storyPoints";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "workspaceId" UUID,
ALTER COLUMN "estimatedHours" SET DATA TYPE DOUBLE PRECISION,
ALTER COLUMN "progress" DROP NOT NULL,
ALTER COLUMN "progress" DROP DEFAULT,
ALTER COLUMN "storyPoints" DROP DEFAULT;

-- AlterTable
ALTER TABLE "TaskDependency" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'FINISH_TO_START';

-- DropTable
DROP TABLE "Milestone";

-- DropTable
DROP TABLE "ReleaseMetrics";

-- DropTable
DROP TABLE "SprintMetrics";

-- DropEnum
DROP TYPE "DecisionType";

-- DropEnum
DROP TYPE "DependencyType";

-- DropEnum
DROP TYPE "DocumentType";

-- DropEnum
DROP TYPE "MeetingType";

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" UUID NOT NULL,
    "meetingId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SprintMetric" (
    "id" UUID NOT NULL,
    "sprintId" UUID NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedPoints" INTEGER NOT NULL,
    "remainingPoints" INTEGER NOT NULL,

    CONSTRAINT "SprintMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseMilestone" (
    "id" UUID NOT NULL,
    "releaseId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReleaseMilestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReleaseMetric" (
    "id" UUID NOT NULL,
    "releaseId" UUID NOT NULL,
    "metricData" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReleaseMetric_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInsight" ADD CONSTRAINT "AIInsight_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintMetric" ADD CONSTRAINT "SprintMetric_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseMilestone" ADD CONSTRAINT "ReleaseMilestone_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseMetric" ADD CONSTRAINT "ReleaseMetric_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SimulationScenario" ADD CONSTRAINT "SimulationScenario_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitRecord" ADD CONSTRAINT "CommitRecord_repoId_fkey" FOREIGN KEY ("repoId") REFERENCES "GitHubRepository"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommitRecord" ADD CONSTRAINT "CommitRecord_pullRequestId_fkey" FOREIGN KEY ("pullRequestId") REFERENCES "PullRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReleaseNote" ADD CONSTRAINT "ReleaseNote_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "Release"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectRetrospective" ADD CONSTRAINT "ProjectRetrospective_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintRetrospective" ADD CONSTRAINT "SprintRetrospective_sprintId_fkey" FOREIGN KEY ("sprintId") REFERENCES "Sprint"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SprintRetrospective" ADD CONSTRAINT "SprintRetrospective_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

