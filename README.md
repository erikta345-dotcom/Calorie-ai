# Calorie AI 🥗✨

Tracker de calorías y macros con IA. PWA mobile-first, 100% gratuito.
Diseñado para **ganar músculo** — trackea calorías, proteína, carbos y grasa.

## Stack
- **Next.js 14** + TypeScript
- **SQLite** + Prisma (BD local, sin coste)
- **Gemini Flash Vision** (IA gratuita — analiza fotos de comida)
- **Open Food Facts** (base de datos de alimentos, gratis)
- **Recharts** (gráficas semanales)
- **PWA** — instalable en iOS y Android

---

## 🚀 Setup en 5 pasos

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp .env.example .env
```
Edita `.env` con tu API key de Gemini:
→ Consíguela gratis en https://aistudio.google.com/app/apikey

### 3. Crear la base de datos
```bash
npm run db:push
```

### 4. Arrancar
```bash
npm run dev
```
→ http://localhost:3000

### 5. Deploy en Vercel (opcional, gratis)
```bash
npx vercel
```
> Para producción cambia SQLite por **Turso** (SQLite en la nube, gratis).
> Añade las variables de entorno en el dashboard de Vercel.

---

## 📱 Instalar como app en el móvil

**iOS (Safari):** Compartir → Añadir a pantalla de inicio  
**Android (Chrome):** Menú → Instalar app

---

## 🗂️ Estructura del proyecto

```
app/
├── page.tsx                  # Dashboard diario (anillo + macros + comidas)
├── scan/page.tsx             # Escanear foto con Gemini Vision
├── search/page.tsx           # Buscar en Open Food Facts
├── history/page.tsx          # Gráficas semanales
├── settings/page.tsx         # Objetivos personales
└── api/
    ├── ai-scan/route.ts      # Gemini Vision → macros estimados
    ├── search/route.ts       # Proxy Open Food Facts
    ├── entries/
    │   ├── route.ts          # GET (listar) / POST (crear)
    │   └── [id]/route.ts     # DELETE
    └── settings/
        └── route.ts          # GET / PUT objetivos
components/
├── BottomNav.tsx             # Navegación inferior
├── CalorieRing.tsx           # Anillo SVG de calorías
└── MacroBar.tsx              # Barra de progreso de macros
lib/
├── prisma.ts                 # Cliente BD
└── utils.ts                  # Helpers
prisma/
└── schema.prisma             # Modelos: FoodEntry, UserSettings
```

---

## 🎯 Objetivos por defecto (ganar músculo)

| Macro | Cálculo | Ejemplo 75kg |
|-------|---------|-------------|
| Calorías | peso × 33 kcal | 2,475 kcal |
| Proteína | peso × 2g | 150g |
| Carbos | 45% calorías | ~278g |
| Grasa | 25% calorías | ~69g |

Configura los tuyos en ⚙️ Ajustes.

---

## 🔮 Ideas para extender

- [ ] Escáner de código de barras
- [ ] Recetas guardadas
- [ ] Exportar datos a CSV
- [ ] Widget para iOS
- [ ] Notificaciones recordatorio
