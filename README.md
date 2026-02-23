# FinTrack — Personal Finance Dashboard

> Track expenses, set budgets, and visualise your spending — all in one beautiful, secure dashboard. No spreadsheets, no complexity.

![FinTrack](https://img.shields.io/badge/version-1.0.0-gold) ![Vite](https://img.shields.io/badge/build-Vite_6-646CFF?logo=vite) ![Supabase](https://img.shields.io/badge/backend-Supabase-3ECF8E?logo=supabase) ![Chart.js](https://img.shields.io/badge/charts-Chart.js_4-FF6384?logo=chartdotjs) ![Deploy](https://img.shields.io/badge/deploy-Vercel-black?logo=vercel)

---

## Overview

FinTrack is a full-stack personal finance web application that lets users log daily expenses, set monthly income and budget targets, and instantly visualise spending patterns through interactive charts. Everything is synced to the cloud in real time — no manual saves, no lost data.

The project is built with **vanilla JavaScript (ES modules)**, **Vite** as the build tool, **Supabase** for authentication and a hosted PostgreSQL database, and **Chart.js** for data visualisation. The front end is a single HTML file with a polished dark-themed landing page and a fully functional dashboard app all in one.

---

## Features

### Expense Tracking
- Add, edit, and delete expenses with a name, amount, category, and date
- All entries are cloud-synced to Supabase instantly
- Expenses auto-sorted by date and creation time

### Budget & Income Management
- Set a monthly income and a budget target for any month
- Live progress bar shows how much of the budget has been used
- Colour-coded warnings as spending approaches or exceeds budget
- Net savings calculated automatically (income minus total spending)

### Interactive Charts (Chart.js 4)
| Chart | Type | Purpose |
|---|---|---|
| Spending by Category | Doughnut | Proportion of spend per category |
| Category Breakdown | Bar | Absolute amounts per category |
| Monthly Trend | Line (filled) | Cumulative spending over past months |

All charts update instantly whenever expenses, budget, or income change.

### Custom Categories
- 8 smart defaults pre-loaded: Housing, Food, Transport, Entertainment, Health, Utilities, Shopping, Other
- Create unlimited custom categories with any hex colour
- Each profile has its own independent category list
- Search and filter expenses by category

### Multiple Profiles
- Create unlimited profiles per account (personal, family, side project, etc.)
- Each profile has its own expenses, budget, income, categories, and currency
- Switch between profiles with a single click
- The last active profile is remembered across sessions

### Multi-Currency Support
- 11 currency options available per profile
- Currency symbol shown throughout all charts and summaries

### Month Navigation
- Browse any past or future month with back/forward controls
- Data is stored and retrievable for every month independently
- The last viewed month is persisted per profile in `localStorage`

### Export & Backup
- **CSV Export** — Download the current month's expenses as a spreadsheet
- **JSON Backup** — Export the entire account (all profiles, categories, expenses, stats) as JSON
- **JSON Restore** — Re-import a backup file to restore all data in one click
- CSV injection protection built in

### Authentication
- Email/password sign-up, sign-in, and password reset
- Powered by Supabase Auth with email confirmation flow
- Password-change support from within the dashboard

### Security
- **Row Level Security (RLS)** — Every database row is locked to its owner; no cross-user data access is possible at the database level
- **256-bit TLS** — All traffic encrypted in transit via Supabase + Vercel
- **Strict CSP & HSTS headers** — Configured in `vercel.json`
- Passwords handled entirely by Supabase Auth (never stored by the app)

### Landing Page
- Full marketing landing page with animated hero, feature cards, "How It Works" steps, and a live mock dashboard preview
- Smooth scroll-reveal animations using IntersectionObserver
- Responsive mobile navigation with hamburger menu

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript (ES Modules) |
| Build Tool | [Vite 6](https://vitejs.dev/) |
| Backend / Database | [Supabase](https://supabase.com/) (PostgreSQL + Auth) |
| Charts | [Chart.js 4](https://www.chartjs.org/) |
| Fonts | Google Fonts — DM Mono, Playfair Display, DM Sans |
| Deployment | [Vercel](https://vercel.com/) |

---

## Database Schema

```
profiles          — one per user per named budget context
categories        — color-coded tags, scoped per profile
monthly_stats     — budget & income targets, per profile per month
expenses          — individual expense entries, per profile
```

Row Level Security policies are defined in `sql/002_rls_policies.sql`. Default categories are auto-seeded on profile creation via a Supabase database trigger (`sql/003_seed_defaults.sql`).

---

## Project Structure

```
├── index.html            # Landing page + app shell (single file)
├── style.css             # Dashboard / app styles
├── landing.css           # Landing page styles
├── vite.config.js        # Vite configuration
├── vercel.json           # Deployment & security headers
├── js/
│   ├── app.js            # App entry point, event binding, auth lifecycle
│   ├── auth.js           # Supabase Auth wrappers (signIn, signUp, reset…)
│   ├── charts.js         # Chart.js initialisation & update logic
│   ├── config.js         # Environment variable validation
│   ├── data.js           # All state management & Supabase data operations
│   ├── supabaseClient.js # Supabase client singleton
│   └── ui.js             # DOM rendering, form handling, toasts, modals
└── sql/
    ├── 001_init_schema.sql      # Table definitions & triggers
    ├── 002_rls_policies.sql     # Row Level Security policies
    ├── 003_seed_defaults.sql    # Default category seeding function
    └── 004_fix_structural_issues.sql
```

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+
- A free [Supabase](https://supabase.com/) account

### 1. Clone the repository
```bash
git clone https://github.com/your-username/fintrack.git
cd fintrack
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up Supabase
1. Create a new Supabase project
2. Run the SQL files in order in the Supabase SQL Editor:
   - `sql/001_init_schema.sql`
   - `sql/002_rls_policies.sql`
   - `sql/003_seed_defaults.sql`
   - `sql/004_fix_structural_issues.sql`

### 4. Configure environment variables
Create a `.env` file in the project root:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run the development server
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

### 6. Build for production
```bash
npm run build
```

---

## Deployment (Vercel)

The project includes a `vercel.json` with security headers (CSP, HSTS, X-Frame-Options) pre-configured. To deploy:

1. Push the repository to GitHub
2. Import the project in [Vercel](https://vercel.com/)
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Environment Variables in the Vercel project settings
4. Deploy — Vercel will automatically run `npm run build`

---

## License

MIT