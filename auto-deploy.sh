#!/usr/bin/env bash
# Tự động deploy khi có commit mới trên nhánh phát triển.
# Chạy định kỳ qua cron trên VPS -> mỗi lần push code, VPS tự pull + deploy,
# không cần gõ tay. Chỉ deploy khi thật sự có commit mới (up-to-date thì bỏ qua).
#
# Cài 1 lần (xem README / hướng dẫn), sau đó không phải làm gì nữa.

set -euo pipefail

BRANCH="claude/fanpage-ad-management-aiihk8"
cd "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Khoá chống chạy chồng (deploy trước chưa xong mà cron lần sau đã tới).
LOCK="/tmp/gpt-auto-deploy.lock"
if [ -f "$LOCK" ] && kill -0 "$(cat "$LOCK" 2>/dev/null)" 2>/dev/null; then
  exit 0
fi
echo $$ > "$LOCK"
trap 'rm -f "$LOCK"' EXIT

ts() { date "+%Y-%m-%d %H:%M:%S"; }

git fetch origin "$BRANCH" --quiet
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse "origin/$BRANCH")

if [ "$LOCAL" = "$REMOTE" ]; then
  # Không có gì mới — im lặng để log không phình.
  exit 0
fi

echo "[$(ts)] Có commit mới ($REMOTE) — bắt đầu deploy…"
# Đưa mã nguồn về đúng bản trên nhánh (.env bị gitignore nên KHÔNG bị đụng).
git reset --hard "origin/$BRANCH"
./deploy.sh
echo "[$(ts)] Deploy xong: $(git rev-parse --short HEAD)"
