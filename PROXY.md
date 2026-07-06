# Cắm app vào web server có sẵn (Phương án B)

Dùng khi VPS **đã có** nginx/Apache/aaPanel lo cổng 80/443. App chạy nội bộ ở
`127.0.0.1:<APP_PORT>`, web server sẵn có nhận `app.hangdoistudio.vn` rồi trỏ vào đó.

> **Cổng nội bộ**: `deploy.sh` tự dò cổng còn trống và ghi vào `.env` biến `APP_PORT`
> (mặc định 3001; nếu bận sẽ nhảy 3002/3010/…). Xem cổng thật: `grep APP_PORT .env`.
> Các ví dụ dưới dùng `3001` — thay bằng cổng thật của bạn.

## 1. Chạy app (không kèm Caddy)

```bash
cd GPT
cp .env.deploy.example .env
nano .env          # sửa DB_PASSWORD (DOMAIN đã là app.hangdoistudio.vn)
docker compose -f docker-compose.proxy.yml up -d --build
```

Kiểm tra app đã lên: `curl -I http://127.0.0.1:3001` → thấy `HTTP/1.1 200` là ổn.

## 2. Cấu hình reverse proxy

### Cách A — nginx thủ công

Tạo file `/etc/nginx/sites-available/app.hangdoistudio.vn`:

```nginx
server {
    listen 80;
    server_name app.hangdoistudio.vn;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Bật site + cấp SSL:

```bash
sudo ln -s /etc/nginx/sites-available/app.hangdoistudio.vn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d app.hangdoistudio.vn      # tự thêm HTTPS
```

### Cách B — aaPanel / CyberPanel (giao diện web)

1. **Website → Add site** → domain `app.hangdoistudio.vn` (không cần tạo thư mục PHP).
2. Vào site vừa tạo → **Reverse proxy / Proxy** → thêm proxy tới `http://127.0.0.1:3001`.
3. **SSL** → **Let's Encrypt** → cấp chứng chỉ cho `app.hangdoistudio.vn` → bật **Force HTTPS**.

## 3. Xong

Mở `https://app.hangdoistudio.vn`. Nhớ khai báo trong Facebook App
(*Facebook Login → Valid OAuth Redirect URIs*):

```
https://app.hangdoistudio.vn/api/auth/facebook/callback
```
