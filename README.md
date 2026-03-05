# Trinity Ops Manager

AI-powered Salesforce operations dashboard for lead management, rep performance, and pipeline health.

## Stack
- **Next.js 15** (App Router) — frontend + API routes
- **Supabase** — Postgres database for trend caching
- **Salesforce REST API** — data source via SOQL
- **Vercel** — deployment + cron jobs (syncs every 30 min)

## Setup

### 1. Salesforce Connected App
In Salesforce Setup → App Manager → New Connected App:
- Enable OAuth
- Scopes: `api`, `refresh_token`
- Copy Consumer Key → `SF_CLIENT_ID`
- Copy Consumer Secret → `SF_CLIENT_SECRET`

> **Enable Field History Tracking** on Lead (Status, Owner) and Opportunity (Stage) for time-in-stage metrics.

### 2. Supabase
1. Create project at supabase.com
2. Run `supabase/schema.sql` in the SQL editor
3. Copy Project URL → `NEXT_PUBLIC_SUPABASE_URL`
4. Copy anon key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Copy service role key → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Environment Variables
Copy `.env.example` to `.env.local` and fill in all values.

```bash
cp .env.example .env.local
```

### 4. Local Development
```bash
npm install
npm run dev
```

### 5. Deploy to Vercel
```bash
# Push to GitHub, then connect repo to Vercel
# Add all env vars in Vercel dashboard
# Vercel will auto-run the cron every 30 minutes
```

## Architecture

```
Salesforce → /api/sync (cron, every 30min) → Supabase
Supabase → /api/dashboard → React Dashboard
Salesforce → /api/leads/time-in-stage → Live query
```

## Custom Object Note
If your Transactions object has a different API name than `Transaction__c`, update `lib/queries.ts`:
```typescript
FROM Transaction__c  →  FROM YourObject__c
```

## Alerts
The `/api/alerts` endpoint generates AI alerts for:
- Leads with 14+ days no activity
- Reps with 5+ stale leads
- Reps with 0 logged activities

Add more alert rules in `app/api/alerts/route.ts`.
