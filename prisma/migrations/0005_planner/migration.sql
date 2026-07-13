-- Content Planner (Phase 1): mở rộng Post cho lịch nội dung. Additive thuần.
ALTER TABLE "Post" ADD COLUMN "mediaType" TEXT;
ALTER TABLE "Post" ADD COLUMN "mediaUrls" JSONB;
ALTER TABLE "Post" ADD COLUMN "fbPermalink" TEXT;
ALTER TABLE "Post" ADD COLUMN "error" TEXT;
ALTER TABLE "Post" ADD COLUMN "source" TEXT;
ALTER TABLE "Post" ADD COLUMN "sourceIgMediaId" TEXT;
ALTER TABLE "Post" ADD COLUMN "sourceFbId" TEXT;

-- Lọc lịch theo thời gian.
CREATE INDEX "Post_scheduledAt_idx" ON "Post"("scheduledAt");
