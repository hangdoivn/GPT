-- Copy bài Instagram → Fanpage. Additive: 1 cột mới trên Page + 2 bảng mới.

-- AlterTable
ALTER TABLE "Page" ADD COLUMN "igUserId" TEXT;

-- CreateTable
CREATE TABLE "CopiedPost" (
    "id" TEXT NOT NULL,
    "igMediaId" TEXT NOT NULL,
    "targetPageId" TEXT NOT NULL,
    "sourcePageId" TEXT,
    "igCaption" TEXT,
    "rewrittenCaption" TEXT,
    "mediaType" TEXT,
    "mediaUrls" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "fbPostId" TEXT,
    "fbPermalink" TEXT,
    "error" TEXT,
    "igTimestamp" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopiedPost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagePositioning" (
    "id" TEXT NOT NULL,
    "pageId" TEXT NOT NULL,
    "pageName" TEXT,
    "audience" TEXT,
    "voice" TEXT,
    "hashtags" TEXT,
    "cta" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PagePositioning_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CopiedPost_igMediaId_targetPageId_key" ON "CopiedPost"("igMediaId", "targetPageId");

-- CreateIndex
CREATE INDEX "CopiedPost_status_idx" ON "CopiedPost"("status");

-- CreateIndex
CREATE INDEX "CopiedPost_targetPageId_idx" ON "CopiedPost"("targetPageId");

-- CreateIndex
CREATE UNIQUE INDEX "PagePositioning_pageId_key" ON "PagePositioning"("pageId");
