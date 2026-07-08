-- AlterTable: thêm định nghĩa tệp khách cao cấp (ICP) vào mục tiêu.
ALTER TABLE "Goal" ADD COLUMN "icpMonthlyMinVnd" INTEGER;
ALTER TABLE "Goal" ADD COLUMN "icpNote" TEXT;
