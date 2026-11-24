# FairFarm

> **Fair prices. Direct connections. Stronger farmers.**  
> Direct Market Access Platform for Marginal Farmers

FairFarm connects smallholder growers directly with institutional buyers and warehouse holders. It features automated NetProfit offer ranking, shared transport pooling, mandi price intelligence, multilingual voice access, and a Supabase-backed multi-role authentication system with real 6-digit Email OTP verification.

---

## Features

- **Multi-Role Authentication & Email OTP Verification**: Supports **Farmer**, **Client / Buyer**, and **Warehouse Holder** accounts with real Supabase Auth 6-digit email OTP verification, password recovery, role-based route guards, and RLS role-immutability protection.
- **NetProfit Engine**: Calculates and ranks real net earnings after factoring in transport, transit damage, and handling costs, protecting farmers from deceptive nominal pricing.
- **Shared Transport Pooling**: Aggregates nearby farmer shipments headed in similar directions to drastically cut logistics expenses.
- **Mandi Price Benchmarks & Forecasts**: Live regional prices and 7–60 day harvest price projections.
- **Multilingual & Voice-Enabled**: Supports English, Hindi, and Kannada with voice interactions tailored for accessibility.

---

## Project Architecture

```text
FairFarm/
├── frontend/          # React + TypeScript + Vite + Tailwind CSS + Framer Motion + Lucide
├── backend/           # FastAPI backend with NetProfit calculations, Auth & Voice AI
├── supabase/          # PostgreSQL schema, RLS policies, RPCs, and Role/Auth hardening migrations
├── .env.example       # Environment configuration template
└── README.md
```

---

## Getting Started

### Prerequisites

- **Node.js** (v18+)
- **Python** (v3.10+)
- **Supabase Project** (for live authentication, Email OTP, and PostgreSQL persistence)

### 1. Environment Variables

Copy `.env.example` to `.env` in both `frontend/` and `backend/` (or root as configured):

| Variable | Where | Description |
| :--- | :--- | :--- |
| `SUPABASE_URL` | Backend | Your Supabase project URL |
| `SUPABASE_ANON_KEY` | Backend | Supabase anon public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Backend only | Service role key (never expose in `frontend/` or `VITE_*`) |
| `VITE_SUPABASE_URL` | Frontend | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Frontend | Supabase anon public key |
| `VITE_API_BASE_URL` | Frontend | FastAPI URL (default `http://localhost:8000`) |
| `VITE_OTP_RESEND_COOLDOWN_SECONDS` | Frontend (optional) | Resend countdown in seconds (default `60`) |
| `VITE_OTP_EXPIRY_SECONDS` | Frontend (optional) | OTP expiry window in seconds (default `3600`) |

> **Preview / Demo Mode**: If `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` are not configured, the frontend runs in **Preview Mode** with 1-click demo profiles for Farmer, Client / Buyer, and Warehouse Holder. Live registration, login, and Email OTP verification activate automatically once valid Supabase credentials are provided.

### 2. Database & Supabase Migrations

Run the SQL migrations in `supabase/migrations/` in order via the **Supabase Dashboard → SQL Editor**:

1. `001_schema.sql`
2. `002_rls_policies.sql`
3. `003_functions.sql`
4. `004_warehouse_role_and_auth_hardening.sql` *(adds `'warehouse'` role, role-whitelisted signup trigger, role-immutability trigger against privilege escalation, and `is_email_verified()` helper)*

### 3. Supabase Authentication & Email OTP Configuration

To use real 6-digit Email OTP verification:

1. In **Supabase Dashboard → Authentication → Providers → Email**:
   - Enable **Email** provider.
   - Enable **Confirm email** (ensures Supabase does not issue a session until the email is verified).
2. In **Supabase Dashboard → Authentication → Email Templates**:
   - **Confirm signup**: Include `{{ .Token }}` so users receive the 6-digit verification code (for example: `Your FairFarm verification code is: {{ .Token }}`).
   - **Reset password**: Include `{{ .Token }}` (and optionally `{{ .ConfirmationURL }}` pointing to `/reset-password`).
3. In **Supabase Dashboard → Authentication → URL Configuration**:
   - Add `http://localhost:5173/verify-email` and `http://localhost:5173/reset-password` (plus your production URLs) to **Redirect URLs**.
4. For production volume, configure custom SMTP under **Project Settings → Authentication → SMTP Settings** (Supabase's built-in emailer is rate-limited for development).

### 4. Start the Frontend

```bash
cd frontend
npm install
npm run dev
```

### 5. Start the Backend

```bash
cd backend
python -m venv venv
# Windows:
.\venv\Scripts\activate
# Linux/macOS:
# source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

---

## How Roles Work

| Role | Internal DB Role | Dashboard Route | Capabilities |
| :--- | :--- | :--- | :--- |
| **Farmer** | `farmer` | `/farmer/dashboard` | Create produce listings, compare offers via NetProfit Match, coordinate shared transport, manage orders, view market prices. |
| **Client / Buyer** | `buyer` | `/buyer/dashboard` | Browse marketplace, submit offers, track active offers and orders, view market prices. |
| **Warehouse Holder** | `warehouse` | `/warehouse/dashboard` | Protected warehouse portal with verified facility profile, marketplace visibility, and mandi price/forecast tools. |

> **Security**: Roles are persisted in `public.profiles` by the database signup trigger and protected by a `BEFORE UPDATE` trigger (`profiles_prevent_role_change`) so users cannot escalate or switch roles by modifying browser state or calling profile update APIs. Both frontend route guards and backend FastAPI dependencies (`get_current_user`, `require_farmer`, `require_buyer`, `require_warehouse`) validate against `public.profiles` and require `email_confirmed_at`.

---

## Testing

### Frontend Unit, Build & Lint

```bash
cd frontend
npm run build
npm run lint
npm test
```

### Frontend E2E (Playwright)

```bash
cd frontend
npx playwright test
```

### Backend Tests (Pytest)

```bash
cd backend
.\venv\Scripts\python -m pytest -q
```

### Testing Real Email OTP Verification

1. Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `frontend/.env` and apply all 4 migrations.
2. Open `/register`, choose a role (**Farmer**, **Client / Buyer**, or **Warehouse Holder**), and submit a real email address you can read.
3. Enter the 6-digit code from your inbox on the **Check your inbox** screen (or test an invalid code to verify error handling, and **Resend** after the 60s countdown).
4. Once verified, you are redirected automatically to `/farmer/dashboard`, `/buyer/dashboard`, or `/warehouse/dashboard`.

---

## License

This project is licensed under the MIT License.
