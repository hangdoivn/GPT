-- Bật đồng bộ định kỳ (mỗi 60 phút) cho bản ghi cấu hình singleton.
-- Chạy 1 lần qua `prisma migrate deploy`; sau này người dùng vẫn tự tắt/bật
-- trong Cài đặt (migration đã áp dụng sẽ không chạy lại).
INSERT INTO "SyncConfig" ("id", "enabled", "intervalMinutes", "updatedAt")
VALUES ('singleton', true, 60, NOW())
ON CONFLICT ("id") DO UPDATE
  SET "enabled" = true,
      "intervalMinutes" = 60,
      "updatedAt" = NOW();
