# EduFutura

AI-powered education platform for South African students. Master your CAPS curriculum with personalized learning, adaptive quizzes, community forums, career guidance, and real-time analytics — all in one place.

---

## Key Features

- **CAPS Curriculum** — Structured subject content aligned to the South African CAPS syllabus (Grades 10–12)
- **AI Tutoring** — Floating AI chat assistant powered by OpenAI / Cerebras for instant study help
- **Adaptive Quizzes** — Auto-generated quizzes with short-answer grading, cooldown timers, and attempt history
- **Progress Tracking** — Per-chapter reading progress, streaks, badges, and achievement display
- **Community Forums** — Rich-text posts, replies, reputation system, and resource sharing
- **Career Guidance** — Career quiz, salary calculator, institution finder, and AI career counselling
- **Study Buddy Finder** — Match with peers for group study sessions
- **Leaderboard & Certificates** — Competitive leaderboard and verifiable PDF certificates
- **Admin Dashboard** — User management, curriculum import, moderation, analytics, audit log, and job monitoring
- **Subscription Tiers** — Free and Premium (R60/month or R120/year) via Paystack integration
- **PWA Support** — Installable progressive web app with offline caching and background sync
- **Real-time Notifications** — Live activity feed and notification bell via Supabase Realtime
- **Dark Mode** — Full light/dark theme support via `next-themes`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [React 18](https://react.dev) + [TypeScript 5](https://www.typescriptlang.org) |
| Build Tool | [Vite 5](https://vitejs.dev) with SWC |
| Styling | [Tailwind CSS 3](https://tailwindcss.com) + [tailwindcss-animate](https://github.com/jamiebuilds/tailwindcss-animate) |
| UI Components | [shadcn/ui](https://ui.shadcn.com) (Radix UI primitives) |
| Backend / DB | [Supabase](https://supabase.com) (Postgres, Auth, Storage, Edge Functions, Realtime) |
| Data Fetching | [TanStack Query v5](https://tanstack.com/query) |
| Routing | [React Router v6](https://reactrouter.com) |
| Forms | [React Hook Form](https://react-hook-form.com) + [Zod](https://zod.dev) |
| Rich Text | [Tiptap](https://tiptap.dev) |
| Charts | [Recharts](https://recharts.org) |
| Animations | [Framer Motion](https://www.framer.com/motion) |
| Payments | [Paystack](https://paystack.com) |
| AI Services | OpenAI, Cerebras, ElevenLabs (via Supabase Edge Functions) |
| PWA | [vite-plugin-pwa](https://vite-pwa-org.netlify.app) + Workbox |

---

## Prerequisites

- [Node.js](https://nodejs.org) v18+ (or [Bun](https://bun.sh) v1+)
- npm, bun, or another Node package manager
- A [Supabase](https://supabase.com) project

---

## Local Development

### 1. Clone the repository

```bash
git clone <YOUR_GIT_URL>
cd edufutura-next-gen
```

### 2. Install dependencies

```bash
npm install
# or
bun install
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your-supabase-anon-key>
VITE_SUPABASE_PROJECT_ID=<your-project-ref>
```

You can find these values in your Supabase project under **Settings → API**.

### 4. Start the development server

```bash
npm run dev
# or
bun run dev
```

The app will be available at `http://localhost:8080`.

### Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with HMR on port 8080 |
| `npm run build` | Production build (minified, tree-shaken) |
| `npm run build:dev` | Development build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Project Structure

```
edufutura-next-gen/
├── public/                  # Static assets & PWA icons
├── src/
│   ├── components/
│   │   ├── admin/           # Admin dashboard components
│   │   ├── ai/              # AI chat modal & floating button
│   │   ├── analytics/       # Score trends, subject performance
│   │   ├── auth/            # Login, registration, protected routes
│   │   ├── career/          # Career cards & institution filters
│   │   ├── community/       # Forums, posts, resources, study groups
│   │   ├── curriculum/      # Chapter reader, navigation, progress
│   │   ├── dashboard/       # Student dashboard layout & widgets
│   │   ├── landing/         # Hero, features, pricing, footer
│   │   ├── notifications/   # Notification bell & panel
│   │   ├── onboarding/      # Onboarding flow components
│   │   ├── profile/         # Profile sections & settings forms
│   │   ├── pwa/             # PWA install & update prompts
│   │   ├── quiz/            # Quiz attempt history & cooldown
│   │   ├── subscription/    # Feature gates & upgrade banners
│   │   └── ui/              # shadcn/ui base components
│   ├── config/              # Pricing & feature flag constants
│   ├── hooks/               # Custom React hooks (auth, quiz, AI, etc.)
│   ├── integrations/
│   │   └── supabase/        # Supabase client & generated types
│   ├── lib/                 # Utilities, error handling, logging
│   ├── pages/               # Route-level page components
│   │   ├── admin/           # Admin-only pages
│   │   ├── auth/            # Password reset & email verify
│   │   └── onboarding/      # Multi-step onboarding flow
│   ├── services/            # AI, cache, storage, security services
│   ├── types/               # Shared TypeScript types
│   └── utils/               # Quiz grading & toast helpers
├── supabase/
│   ├── functions/           # Supabase Edge Functions (AI, payments, jobs)
│   └── migrations/          # Database migration SQL files
├── load-tests/              # k6 load test scenarios
├── .env                     # Environment variables (not committed)
├── package.json
├── tailwind.config.ts
├── vite.config.ts
└── tsconfig.json
```

---

## Deployment

### Lovable (recommended)

Open the project at [https://lovable.dev/projects/c07064f1-33f1-455e-8538-a4a5289fbd4c](https://lovable.dev/projects/c07064f1-33f1-455e-8538-a4a5289fbd4c) and click **Share → Publish**. Lovable handles the build and hosting automatically.

To connect a custom domain: **Project → Settings → Domains → Connect Domain**.

### Manual / Netlify

```bash
npm run build
```

Deploy the generated `dist/` folder to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

For Netlify, add a `_redirects` file inside `public/`:

```
/*  /index.html  200
```

Set the same environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) in your hosting provider's dashboard.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon/public API key |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project reference ID |

> Never commit your `.env` file. It is already listed in `.gitignore`.
