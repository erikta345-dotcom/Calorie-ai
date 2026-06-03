# Calorie AI

**Track food with your camera. No subscriptions. No bullshit.**

Snap a photo of your meal — Gemini Vision reads the macros. Or scan a barcode. Or search 3M+ foods. Everything stored locally, works offline, installs as an app.

---

## Screenshots

| Dashboard | Scan | Recipes | History |
|-----------|------|---------|---------|
| ![](docs/screenshots/dashboard.png) | ![](docs/screenshots/scan.png) | ![](docs/screenshots/recipes.png) | ![](docs/screenshots/history.png) |

---

## What it does

| Feature | Detail |
|---------|--------|
| **AI photo scan** | Point camera at food → Gemini Vision returns calories + macros instantly |
| **Barcode scanner** | Scan packaged food with your camera |
| **Food search** | 3M+ products from Open Food Facts |
| **Recipes** | Save custom meals, log them in one tap |
| **Daily ring** | Calorie + macro progress at a glance |
| **Weekly charts** | Trends over time |
| **Weight tracking** | Log weight, see progress |
| **Streaks** | Consecutive days logged |
| **Push notifications** | Meal reminders |
| **Export** | Download your data |
| **PWA** | Installs on iOS and Android, works offline |
| **Free** | No account required, data stays on your device |

---

## Stack

- **Next.js 14** + TypeScript
- **SQLite** + Prisma (local) / **Turso** (cloud)
- **Gemini Flash Vision** — free AI tier
- **Open Food Facts** — free food database
- **shadcn/ui** + Tailwind
- **Recharts** — weekly charts
- **ZXing** — barcode scanning
- **Web Push** — notifications
- **NextAuth** — optional login

---

## Self-host

```bash
git clone https://github.com/erikta345-dotcom/Calorie-ai
cd Calorie-ai
npm install
cp .env.example .env
npm run db:push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

**Gemini API key** (free): [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

### Deploy to Vercel

1. Swap `DATABASE_URL` for a [Turso](https://turso.tech) connection string (free tier)
2. Add env vars in Vercel dashboard
3. `npx vercel --prod`

---

## Install as mobile app

**iOS** → Safari → Share → Add to Home Screen  
**Android** → Chrome → Menu → Install app

---

## License

MIT
