#!/usr/bin/env bash
set -Eeuo pipefail

DOMAIN="event.hangdoistudio.vn"
ROOT="/var/www/${DOMAIN}"
BASE="https://raw.githubusercontent.com/hangdoivn/GPT/event-portfolio-deploy/event-portfolio-full"
NGINX_AVAILABLE="/etc/nginx/sites-available/${DOMAIN}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${DOMAIN}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="/root/event-portfolio-backup-${STAMP}"

[[ "${EUID}" -eq 0 ]] || { echo "Run as root"; exit 1; }

apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nginx curl ca-certificates certbot python3-certbot-nginx

mkdir -p "${BACKUP}" "${ROOT}"
cp -a /etc/nginx "${BACKUP}/nginx"
[[ -d "${ROOT}" ]] && cp -a "${ROOT}" "${BACKUP}/website" || true

curl -fsSL "${BASE}/index.html" -o "${ROOT}/index.html"
curl -fsSL "${BASE}/styles.css" -o "${ROOT}/styles.css"
curl -fsSL "${BASE}/enhancements.css" -o "${ROOT}/enhancements.css"
curl -fsSL "${BASE}/app.js" -o "${ROOT}/app.js"
curl -fsSL "${BASE}/enhancements.js" -o "${ROOT}/enhancements.js"
chown -R www-data:www-data "${ROOT}"
find "${ROOT}" -type d -exec chmod 755 {} +
find "${ROOT}" -type f -exec chmod 644 {} +

cat > "${NGINX_AVAILABLE}" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    root ${ROOT};
    index index.html;
    server_tokens off;

    access_log /var/log/nginx/${DOMAIN}.access.log;
    error_log /var/log/nginx/${DOMAIN}.error.log;

    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        try_files \$uri =404;
    }

    location ~* \.(?:css|js)$ {
        expires 1h;
        add_header Cache-Control "public, max-age=3600, must-revalidate";
        try_files \$uri =404;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/javascript application/json image/svg+xml;
}
NGINX

ln -sfn "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
nginx -t
systemctl reload nginx
curl -fsS -H "Host: ${DOMAIN}" http://127.0.0.1/ >/dev/null

RESOLVED="$(getent ahostsv4 "${DOMAIN}" 2>/dev/null | awk '{print $1}' | sort -u | tr '\n' ' ')"
if grep -qw "72.60.108.22" <<<"${RESOLVED}"; then
  certbot --nginx --non-interactive --agree-tos --email hangdoistudio@gmail.com --redirect -d "${DOMAIN}" || true
  systemctl reload nginx
else
  echo "DNS not ready for SSL. Current: ${RESOLVED:-none}"
fi

echo "Deployed: https://${DOMAIN}"
echo "Backup: ${BACKUP}"
