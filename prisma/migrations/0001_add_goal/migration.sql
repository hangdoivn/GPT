-- CreateTable
CREATE TABLE "Goal" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "targetFollowers" INTEGER,
    "targetReachPerWeek" INTEGER,
    "targetPostsPerWeek" INTEGER,
    "deadline" TIMESTAMP(3),
    "audienceNote" TEXT,
    "baselineFollowers" INTEGER,
    "baselineAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);
