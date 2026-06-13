# Silent Palms Command Center — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                    PRODUCTION STACK                      │
│                                                         │
│  Frontend (Vercel)        Backend (Railway/Render)      │
│  ┌─────────────────┐     ┌─────────────────────────┐   │
│  │   Next.js 15    │────▶│    Express.js API        │   │
│  │   Vercel Edge   │     │    Node.js / TypeScript  │   │
│  └─────────────────┘     └──────────┬──────────────┘   │
│                                     │                   │
│                          ┌──────────▼──────────────┐   │
│                          │   Supabase PostgreSQL    │   │
│                          │   (Managed DB + Auth)    │   │
│                          └─────────────────────────┘   │
│                                                         │
│  Storage: Cloudinary       AI: Anthropic Claude         │
└─────────────────────────────────────────────────────────┘
```

---

## Quick Start (Local Development)

### 1. Clone & Setup
```bash
git clone <repo-url> silent-palms-command-center
cd silent-palms-command-center
```

### 2. Environment Variables
```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Docker (Recommended)
```bash
docker-compose up -d
# API: http://localhost:4000
# Frontend: http://localhost:3000
```

### 4. Manual Setup

**Backend:**
```bash
cd backend
npm install
npx prisma migrate dev --name init
npx prisma generate
npm run db:seed
npm run dev
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

Default credentials after seed:
- Email: `admin@silentpalms.com`
- Password: `Admin@SilentPalms2024`

---

## Production Deployment

### Database: Supabase
1. Create project at supabase.com
2. Get `DATABASE_URL` from Settings > Database
3. Run: `cd backend && npx prisma migrate deploy`
4. Run: `npm run db:seed`

### Backend: Railway or Render
```bash
# Railway
railway login
railway init
railway up

# Set environment variables in Railway dashboard
```

Required env vars:
```
DATABASE_URL=<supabase-connection-string>
JWT_SECRET=<secure-random-string-64-chars>
FRONTEND_URL=https://your-app.vercel.app
ANTHROPIC_API_KEY=sk-ant-...
```

### Frontend: Vercel
```bash
cd frontend
vercel --prod

# Set in Vercel dashboard:
NEXT_PUBLIC_API_URL=https://your-api.railway.app/api/v1
```

---

## WhatsApp Business API Integration

1. Create Meta Business account
2. Set up WhatsApp Business API
3. Get Phone Number ID and Access Token
4. Set webhook URL: `https://your-api/api/v1/whatsapp/webhook`
5. Add to `.env`:
```
WHATSAPP_PHONE_NUMBER_ID=...
WHATSAPP_ACCESS_TOKEN=...
WHATSAPP_VERIFY_TOKEN=...
```

---

## Social Media Integrations

### Instagram & Facebook
- Create Meta App at developers.facebook.com
- Add Instagram Basic Display and Facebook Graph API
- Get Page Access Token with `pages_manage_posts` permission

### TikTok
- Create TikTok Developer App
- Use TikTok for Business API for scheduled posting

### Google Business Profile
- Enable Google My Business API in Google Cloud Console
- Create OAuth 2.0 credentials

---

## Security Checklist

- [ ] Change default admin password immediately
- [ ] Use strong JWT_SECRET (64+ random chars)
- [ ] Enable Supabase Row Level Security
- [ ] Set up CORS to allow only your frontend domain
- [ ] Enable rate limiting (already configured)
- [ ] Configure Cloudinary upload presets with restrictions
- [ ] Set up SSL/TLS certificates (Vercel/Railway handle this)
- [ ] Enable Supabase 2FA

---

## Team Role Permissions

| Role             | Bookings | Revenue | Marketing | WhatsApp | Tasks | Reports |
|-----------------|----------|---------|-----------|----------|-------|---------|
| Super Admin     | ✅       | ✅      | ✅        | ✅       | ✅    | ✅      |
| Marketing Admin | 👁       | 👁      | ✅        | 👁       | ✅    | ✅      |
| Guest Relations | ✅       | ❌      | ❌        | ✅       | ✅    | 👁      |
| Property Mgr    | ✅       | 👁      | ❌        | 👁       | ✅    | 👁      |
| Finance Mgr     | 👁       | ✅      | ❌        | ❌       | 👁    | ✅      |

---

## Monitoring & Maintenance

- **Logs**: Morgan HTTP logging + console errors
- **Database**: Prisma metrics + Supabase dashboard
- **Performance**: Vercel Analytics
- **Errors**: Add Sentry: `npm install @sentry/nextjs @sentry/node`

---

## Support

Platform: Silent Palms Villa, Diani Beach, Kenya
Built with Next.js 15, Express.js, PostgreSQL, Prisma, Anthropic Claude
