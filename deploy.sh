#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  Deploy 1 lệnh cho app quản lý fanpage Hàng Đôi (chạy trên VPS).
#  Tự: kiểm tra Docker → dựng .env (sinh secret) → chọn Caddy/proxy
#  theo cổng 80/443 → build & chạy → in bước còn lại.
#
#  Dùng:   ./deploy.sh
#  Không hỏi: DOMAIN=app.hangdoistudio.vn FACEBOOK_APP_SECRET=xxx ./deploy.sh
# ─────────────────────────────────────────────────────────────
set -euo pipefail
cd "$(dirname "$0")"

ENV_FILE=".env"
EXAMPLE=".env.deploy.example"

info() { printf '\033[1;34m▶ %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m✔ %s\033[0m\n' "$1"; }
warn() { printf '\033[1;33m⚠ %s\033[0m\n' "$1"; }
die()  { printf '\033[1;31m✗ %s\033[0m\n' "$1"; exit 1; }

# ── 1) Kiểm tra Docker ───────────────────────────────────────
command -v docker >/dev/null 2>&1 || die "Chưa cài Docker. Cài rồi chạy lại."
docker compose version >/dev/null 2>&1 || die "Thiếu 'docker compose' (Compose v2)."
ok "Docker sẵn sàng"

gen_secret() { openssl rand -hex 24 2>/dev/null || head -c 48 /dev/urandom | od -An -tx1 | tr -d ' \n'; }

getval() { grep -E "^$1=" "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | sed 's/^"//; s/"$//'; }
set_env() {
  local key="$1" val="$2"
  if grep -qE "^${key}=" "$ENV_FILE"; then
    # dùng | làm dấu phân cách để không đụng ký tự trong secret
    sed -i "s|^${key}=.*|${key}=\"${val}\"|" "$ENV_FILE"
  else
    printf '%s="%s"\n' "$key" "$val" >> "$ENV_FILE"
  fi
}
# giá trị còn là placeholder (viết HOA / mẫu) coi như chưa điền
is_placeholder() { [[ -z "$1" || "$1" =~ ^(DOI-|DIEN-|TU-SINH|doi-mat-khau|your-) ]]; }

# ── 2) Dựng .env ─────────────────────────────────────────────
[ -f "$ENV_FILE" ] || { cp "$EXAMPLE" "$ENV_FILE"; info "Đã tạo .env từ mẫu"; }

TTY=0; [ -t 0 ] && TTY=1  # chỉ hỏi khi có bàn phím

DOMAIN="${DOMAIN:-$(getval DOMAIN)}"
if is_placeholder "$DOMAIN"; then
  if [ "$TTY" = 1 ]; then read -rp "Domain [app.hangdoistudio.vn]: " _d || true; DOMAIN="${_d:-app.hangdoistudio.vn}"
  else DOMAIN="app.hangdoistudio.vn"; fi
fi

APP_ID="${FACEBOOK_APP_ID:-$(getval FACEBOOK_APP_ID)}"
if is_placeholder "$APP_ID"; then
  if [ "$TTY" = 1 ]; then read -rp "Facebook App ID [1424421672856268]: " _a || true; APP_ID="${_a:-1424421672856268}"
  else APP_ID="1424421672856268"; fi
fi

APP_SECRET="${FACEBOOK_APP_SECRET:-$(getval FACEBOOK_APP_SECRET)}"
if is_placeholder "$APP_SECRET"; then
  if [ "$TTY" = 1 ]; then read -rsp "Facebook App Secret (không hiển thị): " _s || true; echo; APP_SECRET="${_s:-}"; fi
  [ -n "$APP_SECRET" ] && ! is_placeholder "$APP_SECRET" || die "Cần FACEBOOK_APP_SECRET (đặt biến môi trường hoặc chạy có bàn phím)."
fi

DB_PASSWORD="${DB_PASSWORD:-$(getval DB_PASSWORD)}"
is_placeholder "$DB_PASSWORD" && { DB_PASSWORD="$(gen_secret)"; info "Đã sinh DB_PASSWORD ngẫu nhiên"; }

WEBHOOK="$(getval FACEBOOK_WEBHOOK_VERIFY_TOKEN)"
is_placeholder "$WEBHOOK" && WEBHOOK="$(gen_secret)"
CRON="$(getval CRON_SECRET)"
is_placeholder "$CRON" && CRON="$(gen_secret)"

set_env DOMAIN "$DOMAIN"
set_env FACEBOOK_APP_ID "$APP_ID"
set_env FACEBOOK_APP_SECRET "$APP_SECRET"
set_env DB_PASSWORD "$DB_PASSWORD"
set_env FACEBOOK_WEBHOOK_VERIFY_TOKEN "$WEBHOOK"
set_env CRON_SECRET "$CRON"
ok "Đã ghi .env cho domain $DOMAIN"

# ── 3) Chọn compose theo cổng 80/443 ─────────────────────────
PORTS_BUSY=0
if command -v ss >/dev/null 2>&1; then
  ss -ltn 2>/dev/null | grep -qE ':(80|443)\s' && PORTS_BUSY=1
elif command -v lsof >/dev/null 2>&1; then
  lsof -iTCP:80 -sTCP:LISTEN >/dev/null 2>&1 && PORTS_BUSY=1
  lsof -iTCP:443 -sTCP:LISTEN >/dev/null 2>&1 && PORTS_BUSY=1
fi

if [ "$PORTS_BUSY" -eq 1 ]; then
  COMPOSE="docker-compose.proxy.yml"
  warn "Cổng 80/443 đang bận → dùng bản PROXY (app ở 127.0.0.1:3001). Xem PROXY.md để trỏ nginx/aaPanel."
else
  COMPOSE="docker-compose.yml"
  ok "Cổng 80/443 trống → dùng bản Caddy (tự cấp HTTPS)"
fi

# ── 4) Build & chạy ──────────────────────────────────────────
info "Đang build & khởi động ($COMPOSE)…"
docker compose -f "$COMPOSE" up -d --build

# ── 5) Bước còn lại ──────────────────────────────────────────
PUBIP="$(curl -s --max-time 5 https://api.ipify.org 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}')"
echo
ok "Đã khởi động xong."
echo "──────────────────────────────────────────────"
echo "CÒN 2 VIỆC (chỉ bạn làm được):"
echo
echo "1) DNS: thêm bản ghi A   app → ${PUBIP:-<IP-VPS>}   trong panel tên miền hangdoistudio.vn"
echo "2) Facebook App → Facebook Login → Valid OAuth Redirect URIs, dán:"
echo "     https://${DOMAIN}/api/auth/facebook/callback"
if [ "$COMPOSE" = "docker-compose.proxy.yml" ]; then
  echo
  echo "→ VPS đã có web server: trỏ ${DOMAIN} tới http://127.0.0.1:3001 (hướng dẫn trong PROXY.md)."
fi
echo
echo "Sau đó mở https://${DOMAIN} → Cài đặt → Đăng nhập với Facebook."
echo "Xem log:   docker compose -f $COMPOSE logs -f app"
echo "──────────────────────────────────────────────"
