<div align="center">

# 🌴 Silent Palms Command Center

### Production-Ready SaaS Operations Platform
**Silent Palms Villa · Diani Beach, Kenya**

[![TypeScript](https://img.shields.io/badge/TypeScript-97%25-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Express](https://img.shields.io/badge/Express.js-4.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=flat-square&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.x-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Anthropic](https://img.shields.io/badge/Claude-AI-D97706?style=flat-square&logo=anthropic&logoColor=white)](https://anthropic.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

A centralized **operations, marketing, booking, CRM, automation, reporting & revenue management** platform built for luxury villa hospitality.

[**Live Demo**](#) · [**Documentation**](DEPLOYMENT.md) · [**Report Bug**](https://github.com/Rickybriangg/silent-palms-command-center/issues)

---

</div>

## ✨ Features

### 📊 CEO Dashboard
- **12 live KPI cards** — Revenue today/month, Occupancy rate, Conversion rate, Direct vs OTA booking %, WhatsApp leads, Guest satisfaction score, Monthly growth %
- **Interactive revenue chart** — Area chart with 3/6/12-month view, revenue vs expenses vs profit
- **Occupancy heatmap** — 30-day calendar heatmap with intensity colour coding
- **Booking funnel** — Visual conversion stages from enquiry → confirmed → checked-in → completed
- **Channel breakdown** — Pie chart split across Direct, Airbnb, Booking.com, Expedia, WhatsApp

### 📱 WhatsApp CRM
- **Full conversation inbox** — Real-time chat interface with inbound/outbound messages
- **8-stage guest pipeline** — Kanban board: New Enquiry → Quote Sent → Booked → Arriving → Staying → Checked Out → Review Pending → Repeat Guest
- **8 pre-loaded templates** — `/enquiry` `/book` `/arrival` `/settled` `/upsell` `/checkout` `/review` `/repeat`
- **Guest labels & tagging** — Colour-coded labels per guest
- **One-click template send** — Quick-send bar above message input

### 📅 Booking Management
- **Multi-channel** — Direct, Airbnb, Booking.com, Expedia, WhatsApp, Email
- **Dual view** — List table + interactive monthly calendar
- **Availability checker** — Real-time conflict detection per unit
- **Status pipeline** — Pending → Confirmed → Arriving → Checked In → Checked Out → Cancelled

### 📣 Marketing Automation
- **Campaign manager** — Create, track, and manage multi-channel campaigns
- **Content calendar** — Monthly drag-and-drop scheduling view by platform
- **Social scheduler** — Instagram, Facebook, TikTok, Google Business
- **Excel batch import** — Upload `.xlsx` content batch → AI enhancement → approval → schedule → publish
- **Approval workflow** — Draft → Pending Approval → Approved → Scheduled → Published

### 💰 Revenue Center
- **P&L dashboard** — Revenue, expenses, profit, ADR, RevPAR, ROI
- **3-month AI forecast** — Linear regression on 6-month history
- **Report exports** — Excel revenue report, Excel bookings report, Word executive report
- **Period switching** — Monthly / Annual views

### ⚡ Automation Workflow Builder
- **6 default automations** — Booking confirmation, Pre-arrival, Welfare check, Mid-stay upsell, Checkout, Review request
- **Visual flow display** — Trigger → Action chain with labels
- **Toggle on/off** — Enable/disable each workflow with a switch
- **Run history** — Execution count and last run timestamp

### 🤖 AI Assistant (Claude)
- **Chat mode** — Conversational assistant with Silent Palms context baked in
- **Generator mode** — Social posts, WhatsApp responses, campaigns, blog articles, executive reports, revenue forecasts
- **One-click copy** — Copy any generated output instantly

### ✅ Task Management
- **Kanban board** — To Do → In Progress → In Review → Done
- **Priority levels** — Low, Medium, High, Urgent with colour indicators
- **Assignee & due dates** — Assign to team members with deadline tracking
- **Quick move** — Move tasks between columns inline

### 📄 Document Generator
- **Excel exports** — Revenue report, Bookings report
- **Word documents** — Marketing report, Executive report, Occupancy report
- **One-click download** — All reports generated server-side and downloaded instantly

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 15, React 19, TypeScript, TailwindCSS, Framer Motion |
| **UI Components** | Radix UI primitives, ShadCN-style components |
| **Charts** | Recharts (Area, Bar, Pie charts) |
| **State** | Zustand (auth), React Query (server state) |
| **Backend** | Node.js, Express.js, TypeScript |
| **Database** | PostgreSQL (prod) / SQLite (dev) via Prisma ORM |
| **Auth** | JWT + bcrypt, Role-Based Access Control |
| **AI** | Anthropic Claude (claude-sonnet-4-6) |
| **Storage** | Cloudinary (media), Supabase (database hosting) |
| **Exports** | xlsx (Excel), docx (Word) |
| **Deployment** | Vercel (frontend), Railway (backend + DB) |

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- A database: [Supabase](https://supabase.com) (free) or local PostgreSQL

### 1. Clone
```bash
git clone https://github.com/Rickybriangg/silent-palms-command-center.git
cd silent-palms-command-center
```

### 2. Environment Variables
```bash
cp .env.example .env
```
Edit `.env` and fill in:
```env
DATABASE_URL="postgresql://..."      # Supabase connection string
JWT_SECRET="your-64-char-secret"
ANTHROPIC_API_KEY="sk-ant-..."
```

### 3. Install & Setup
```bash
# Backend
cd backend
npm install
npx prisma migrate dev --name init --schema ../prisma/schema.prisma
npx ts-node --transpile-only src/seed.ts
```

```bash
# Frontend
cd ../frontend
npm install --legacy-peer-deps
```

### 4. Run
```bash
# Terminal 1 — API (port 4000)
cd backend
npx ts-node-dev --respawn --transpile-only src/index.ts

# Terminal 2 — Frontend (port 3000)
cd frontend
npx next dev
```

### 5. Login
Open **http://localhost:3000**

| Field | Value |
|---|---|
| Email | `admin@silentpalms.com` |
| Password | `Admin@SilentPalms2024` |

---

## 🐳 Docker

```bash
cp .env.example .env   # fill in your values
docker-compose up -d
```

Services started:
- **Frontend** → http://localhost:3000
- **API** → http://localhost:4000
- **PostgreSQL** → localhost:5432

---

## 🌐 Production Deployment

### Frontend → Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Rickybriangg/silent-palms-command-center)

1. Import repo at [vercel.com/new](https://vercel.com/new)
2. Set **Root Directory** → `frontend`
3. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-api.railway.app/api/v1`
4. Deploy

### Backend → Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template)

1. New project → Deploy from GitHub repo
2. Set **Root Directory** → `backend`
3. Add a **PostgreSQL** plugin
4. Set environment variables (see `.env.example`)
5. Deploy — Railway auto-runs `npm start`

Full guide: [DEPLOYMENT.md](DEPLOYMENT.md)

---

## 📁 Project Structure

```
silent-palms-command-center/
│
├── frontend/                          # Next.js 15 App
│   └── src/
│       ├── app/
│       │   ├── (auth)/login/          # Login page
│       │   └── (dashboard)/
│       │       ├── dashboard/         # CEO Dashboard
│       │       ├── whatsapp/          # WhatsApp CRM
│       │       ├── bookings/          # Booking management
│       │       ├── marketing/         # Marketing automation
│       │       ├── revenue/           # Revenue center
│       │       ├── automation/        # Workflow builder
│       │       ├── tasks/             # Task management
│       │       ├── ai-assistant/      # AI content generator
│       │       └── documents/         # Report downloads
│       ├── components/
│       │   ├── dashboard/             # KpiCard, RevenueChart, Heatmap, Funnel
│       │   ├── bookings/              # BookingCalendar
│       │   ├── marketing/             # CampaignCard, ContentCalendar
│       │   ├── layout/                # Sidebar, Header
│       │   └── ui/                    # Button, Input, Badge, Select, etc.
│       ├── lib/api.ts                 # Axios instance + interceptors
│       └── store/authStore.ts         # Zustand auth store
│
├── backend/                           # Express.js API
│   └── src/
│       ├── controllers/               # Auth, Dashboard, Booking
│       ├── routes/                    # 12 route modules
│       ├── middleware/                # JWT auth, RBAC, error handler
│       ├── lib/prisma.ts              # Prisma client singleton
│       ├── index.ts                   # Server entry point
│       └── seed.ts                    # DB seed (roles, property, templates)
│
├── prisma/
│   └── schema.prisma                  # 21-table database schema
│
├── docker-compose.yml                 # Full stack Docker setup
├── .env.example                       # Environment variable template
└── DEPLOYMENT.md                      # Production deployment guide
```

---

## 👥 Team Roles & Permissions

| Role | Bookings | Revenue | Marketing | WhatsApp | Tasks | Reports |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| Super Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Marketing Admin | 👁 | 👁 | ✅ | 👁 | ✅ | ✅ |
| Guest Relations | ✅ | ❌ | ❌ | ✅ | ✅ | 👁 |
| Property Manager | ✅ | 👁 | ❌ | 👁 | ✅ | 👁 |
| Finance Manager | 👁 | ✅ | ❌ | ❌ | 👁 | ✅ |

---

## 🗄️ Database Schema

21 tables covering the full hospitality operations stack:

`users` · `roles` · `guests` · `bookings` · `units` · `properties` · `campaigns` · `content_calendar` · `social_posts` · `whatsapp_templates` · `whatsapp_messages` · `guest_labels` · `reviews` · `revenue` · `expenses` · `pricing_rules` · `tasks` · `notifications` · `automation_workflows` · `workflow_executions` · `audit_logs` · `analytics` · `documents`

---

## 🔑 API Endpoints

| Module | Base Path | Key Endpoints |
|---|---|---|
| Auth | `/api/v1/auth` | `POST /login`, `POST /register`, `GET /me` |
| Dashboard | `/api/v1/dashboard` | `GET /stats`, `GET /revenue-chart`, `GET /occupancy-heatmap` |
| Bookings | `/api/v1/bookings` | `GET /`, `POST /`, `GET /calendar`, `GET /availability` |
| Guests | `/api/v1/guests` | `GET /`, `GET /:id`, `POST /`, `PUT /:id` |
| WhatsApp | `/api/v1/whatsapp` | `GET /conversations`, `POST /send`, `GET /pipeline`, `GET /templates` |
| Marketing | `/api/v1/marketing` | `GET /campaigns`, `GET /calendar`, `POST /upload-batch` |
| Revenue | `/api/v1/revenue` | `GET /summary`, `GET /forecast`, `GET /expenses` |
| Automation | `/api/v1/automation` | `GET /`, `POST /`, `POST /:id/toggle`, `POST /seed-defaults` |
| AI | `/api/v1/ai` | `POST /generate`, `POST /chat` |
| Documents | `/api/v1/documents` | `POST /excel/revenue`, `POST /excel/bookings`, `POST /word/report` |

---

## 🎨 Design System

| Token | Value | Usage |
|---|---|---|
| Primary | `#0F766E` | Main actions, active states |
| Secondary | `#14B8A6` | Charts, accents |
| Accent | `#F59E0B` | Highlights, warnings |
| Background | `#F8FAFC` | Page background (light) |

Supports **Dark Mode** and **Light Mode** with `next-themes`.

---

## 📜 License

MIT © [Ricky Brian](https://github.com/Rickybriangg)

---

<div align="center">

Built with ❤️ for **Silent Palms Villa** · Diani Beach, Kenya 🌊

*Powered by Next.js · Express · Prisma · Anthropic Claude*

</div>
