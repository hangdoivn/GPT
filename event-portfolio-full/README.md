# Hang Đôi Event Portfolio — Full Gallery

Production-oriented static portfolio for `event.hangdoistudio.vn`.

## Content

- 15 Event project folders from Google Drive.
- 140 selected photographs across project galleries.
- Navy-black / black / yellow Hang Đôi branding.
- Official Hang Đôi Production logo.
- Category filters.
- Per-project modal gallery.
- Full-screen image viewer with keyboard and swipe navigation.
- Only project covers load on the initial page; gallery images are created after a project is opened.

## VPS deployment

Run as `root` on the Hostinger VPS:

```bash
curl -fsSL https://raw.githubusercontent.com/hangdoivn/GPT/event-portfolio-deploy/event-portfolio-full/deploy.sh | bash
```

The script backs up the current Nginx configuration and existing Event website before updating `/var/www/event.hangdoistudio.vn`.

## Source

- `index.html` — semantic page structure.
- `styles.css` — responsive brand UI.
- `app.js` — project data, category filtering, lazy gallery rendering and lightbox behavior.
- `deploy.sh` — Hostinger VPS / Nginx / SSL deployment.
