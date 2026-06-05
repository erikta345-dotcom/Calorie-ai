# NutriSnap — Contexto completo del proyecto

## Repo
- GitHub: `https://github.com/erikta345-dotcom/Calorie-ai`
- Rama: `main`
- Deploy: `https://calorie-ai-jbrl.vercel.app`
- Local: `C:\Users\oroi\Downloads\calorie-ai\calorie-ai`

## Stack
- **Framework**: Next.js 14 App Router + TypeScript
- **DB**: Turso (LibSQL) — raw SQL, sin ORM. Cliente en `lib/prisma.ts` (se llama `db`)
- **Auth**: NextAuth v4 — Google OAuth + Credentials (email/password con bcryptjs)
- **UI**: shadcn/ui + Tailwind CSS + Recharts
- **IA**: Gemini Flash Vision (escaneo de comida por foto)
- **Pagos**: Stripe (checkout server-side redirect)
- **Email**: Nodemailer (Gmail SMTP)
- **Push**: web-push (VAPID)
- **PWA**: manifest.json + sw.js
- **Rate limit**: @upstash/ratelimit + @upstash/redis
- **Barcode**: @zxing/browser

## Variables de entorno (.env.local)
```
DATABASE_URL=libsql://calorie-ai-erikta345-dotcom.aws-eu-west-1.turso.io
TURSO_AUTH_TOKEN=...
GEMINI_API_KEY=... (no está en .env.local, solo en Vercel)
NEXTAUTH_URL=http://localhost:3000 (prod: https://calorie-ai-jbrl.vercel.app)
NEXTAUTH_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GMAIL_USER=...
GMAIL_APP_PASSWORD=...
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:interns@oroi.eu
ADMIN_SECRET=... (para /api/admin/migrate y /api/admin/codes)
STRIPE_SECRET_KEY=sk_test_... (pendiente confirmar funciona)
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_MONTHLY_PRICE_ID=price_...
STRIPE_PRO_ANNUAL_PRICE_ID=price_...
STRIPE_ELITE_MONTHLY_PRICE_ID=price_...
STRIPE_ELITE_ANNUAL_PRICE_ID=price_...
```

## Base de datos (tablas)
Todas gestionadas con raw SQL vía `db.execute()`. Migración en `/api/admin/migrate` (GET con Bearer token).

- `UserSettings` — id, email, weight, height, age, gender, goal, goalCalories, goalProtein, goalCarbs, goalFat, mealTimes, **tier**, **stripeCustomerId**, **stripeSubscriptionId**, **tierExpiresAt**
- `UserPasswords` — id (email), passwordHash
- `FoodEntry` — id, userId, date, meal, name, calories, protein, carbs, fat, grams, imageUrl, source, createdAt
- `Recipe` — id, userId, name, items (JSON), totalCalories, totalProtein, totalCarbs, totalFat, createdAt
- `WeightLog` — id, userId, date, weight
- `CustomAlert` — id, userId, type, label, time, threshold, enabled, createdAt
- `Feedback` — id, userId, author, message, stars, reply, resolved, createdAt
- `FeedbackLike` — id, feedbackId, userId
- `PushSubscription` — userId, endpoint, keys
- `PromoCodes` — code (PK), tier, maxUses, uses, tierExpiresAt, createdAt

## Rutas de la app
```
/              Dashboard principal
/scan          Escaneo IA + barcode
/search        Búsqueda Open Food Facts
/history       Historial con charts y stats
/recipes       Recetas guardadas (Pro+)
/settings      Configuración + suscripción + promo codes
/pricing       Página de precios (Free/Pro/Elite)
/login         Login/registro
/alerts        Alertas personalizadas
/feedback      Feedback de usuarios
```

## API Routes principales
```
GET  /api/settings              Obtener configuración usuario
PUT  /api/settings              Guardar configuración
GET  /api/entries               Historial entradas (gateado por tier)
POST /api/entries               Crear entrada
GET  /api/export                Exportar CSV (Pro+)
POST /api/ai-scan               Escaneo IA (3/día Free, ∞ Pro/Elite)
GET  /api/search                Búsqueda Open Food Facts
GET  /api/barcode               Búsqueda por código de barras
GET  /api/recipes               Listar recetas (Pro+)
POST /api/recipes               Crear receta (Pro+)
GET  /api/weight                Registro peso (Elite+)
POST /api/weight                Log peso (Elite+)
GET  /api/subscription          Tier actual del usuario
POST /api/subscription/checkout Crear sesión Stripe checkout
POST /api/subscription/portal   Portal de cliente Stripe
POST /api/subscription/webhook  Webhook Stripe (eventos de pago)
POST /api/subscription/redeem   Canjear código promo
GET  /api/admin/migrate         Correr migraciones DB (requiere ADMIN_SECRET)
GET  /api/admin/codes           Listar promo codes (solo owner)
POST /api/admin/codes           Crear promo code (solo owner)
```

## Sistema de tiers (lib/subscription.ts)
| Tier | Historial | AI scans/día | Recetas | Export | Peso | Push |
|------|-----------|--------------|---------|--------|------|------|
| Free | 7 días | 3 | ✕ | ✕ | ✕ | ✕ |
| Pro €4.99/mes · €29.99/año | 30 días | ∞ | ✓ | ✓ | ✕ | ✕ |
| Elite €9.99/mes · €59.99/año | 365 días | ∞ | ✓ | ✓ | ✓ | ✓ |

**Owner**: `interns@oroi.eu` → siempre Elite, hardcodeado en `lib/subscription.ts`.

## Códigos promo
- Owner genera vía `POST /api/admin/codes` → devuelve código 8 chars tipo `A3F9B2C1`
- Usuario canjea en Settings → input "Código de acceso" → botón Canjear
- Tabla `PromoCodes` con maxUses, uses, tierExpiresAt (null = no expira)

## Logo / Branding
- Nombre: **NutriSnap**
- Logo: `public/logo-nutrisnap.svg` — fondo oscuro #09090b, borde redondeado con 3 segmentos (lime/cyan/orange), brackets blancos de escáner, emoji 🍓, línea de escaneo lime con glow
- Iconos PWA: `public/icons/icon-192.png`, `public/icons/icon-512.png`
- Script generación: `scripts/generate-icons.js` (@resvg/resvg-js)

## Archivos clave
```
lib/subscription.ts     Lógica de tiers, getUserTier(), tierGte(), maxHistoryDays()
lib/stripe.ts           Instancia Stripe + PRICE_IDS
lib/auth.ts             NextAuth config (Google + Credentials)
lib/api-auth.ts         requireAuth() y requireAuthOnly() helpers
lib/prisma.ts           Cliente LibSQL (export const db)
hooks/useSubscription.ts Hook cliente para obtener tier actual
app/pricing/page.tsx    Página de precios con toggle mensual/anual
app/history/page.tsx    Historial rediseñado (stats grid 2x2, chart coloreado, tabla)
public/sw.js            Service Worker (push notifications)
```

## Estado actual (pendiente)
- **Stripe en modo test** — price IDs añadidos en Vercel pero el checkout devolvía 400 (posiblemente price IDs incorrectos, pendiente verificar que sean `price_...` no `prod_...`)
- Migración DB ya ejecutada exitosamente
- Webhook de Stripe configurado apuntando a `/api/subscription/webhook`
- Todo desplegado en producción en `https://calorie-ai-jbrl.vercel.app`

## Convenciones
- DB: raw SQL con `db.execute({ sql, args })` — sin Prisma ORM
- Auth check: siempre `requireAuth()` o `requireAuthOnly()` al inicio de cada route handler
- No comentarios en código salvo WHY no obvio
- Caveman mode activo en esta sesión (respuestas cortas, sin filler)
- Git: commit + push después de cada cambio
- Owner email: `interns@oroi.eu`
