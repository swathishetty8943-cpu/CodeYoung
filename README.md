# CodeYoung Trial Class Booking System

A full-stack platform where parents book a **free trial class** (or a paid **Full Coaching** session), get automatically matched with an available mentor, and both sides receive a confirmation email with a meeting link. Every time is stored in UTC and shown in each person's own timezone, DST included.

---

## 🌐 Live Deployments

| Part | What it is | URL |
|------|------------|-----|
| **Frontend App** | Parent + Mentor web app | https://code-young-nzld.vercel.app/ |
| **Admin App** | Admin dashboard | https://code-young-8lim.vercel.app/ |
| **Backend API** | Express REST API (Render) | https://codeyoung-1-paui.onrender.com/api |
| **Health check** | Quick "is the API up?" test | https://codeyoung-1-paui.onrender.com/api/health |

**Database:** MongoDB Atlas (connected through the `MONGO_URI` connection string).
**Emails:** SendGrid (HTTPS API). SMTP is **not** used.

> The backend runs on Render's free tier, which goes to sleep when idle. The first request after a quiet period can take 30–60 seconds. That is normal.

---

## 🔑 Default Accounts (Quick Login)

Created by `npm run seed`. Full details are in [section 10](#-default-accounts-1).

| Role | App | Email | Password |
|------|-----|-------|----------|
| **Admin** | https://code-young-8lim.vercel.app/ | `admin@coach.edu` | `@admin123` |
| **Mentor** (first login) | https://code-young-nzld.vercel.app/ (choose *I am a Mentor*) | For example, `mentor1@codeyoung.dev` | Same as the email, for example `mentor1@codeyoung.dev` |
| **Parent** | https://code-young-nzld.vercel.app/ (choose *I am a Parent*) | Sign up yourself | Chosen at signup |

- Seeded mentors are `mentor1@codeyoung.dev` … `mentor10@codeyoung.dev`.
- Mentors are forced to set a new password on first login.
- Change the admin password right after your first login (Admin app → Settings).

---

## 📑 Table of Contents

0. [Default Accounts (Quick Login)](#-default-accounts-quick-login)
1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Project Structure](#-project-structure)
4. [How the Pieces Connect](#-how-the-pieces-connect)
5. [Requirements](#-requirements)
6. [Environment Variables](#-environment-variables)
   - [Backend `.env`](#61-backend-backendenv)
   - [Frontend App `.env`](#62-frontend-app-frontend-appenv)
   - [Admin App `.env`](#63-admin-app-frontend-adminenv)
7. [Running Locally](#-running-locally)
8. [Third-Party Setup](#-third-party-setup)
   - [MongoDB Atlas](#81-mongodb-atlas)
   - [SendGrid (emails)](#82-sendgrid-emails)
   - [Firebase (Google sign-in)](#83-firebase-google-sign-in)
9. [Deployment](#-deployment)
10. [Default Accounts](#-default-accounts)
11. [Booking Rules](#-booking-rules)
12. [API Reference](#-api-reference)
13. [NPM Scripts](#-npm-scripts)
14. [Troubleshooting](#-troubleshooting)
15. [Security Notes](#-security-notes)

---

## ✨ Features

**Parents**
- Sign up with email + password (verified by a 4-digit email code) or with Google.
- Google sign-up parents are asked for their **country** the first time they open the dashboard.
- Book a **Free Trial** or **Full Coaching** session.
- If the chosen time has no mentor, the system books the **nearest open slot** that day and tells the parent.
- See upcoming and past bookings, and cancel upcoming ones.

**Mentors**
- Accounts are created by the admin (never self-signup).
- Must change the temporary password on first login.
- See their assigned classes in their own timezone.

**Admin**
- Separate login and separate app.
- Create and manage mentors, view all bookings, see stats.
- Change platform settings: free trials per family, slot length, business hours, blackout dates, and more.

**System**
- Automatic mentor matching with load balancing.
- Confirmation emails to both parent and mentor, plus a reminder email before class (runs every minute).
- Times are always shown in the viewer's own timezone.

---

## 🧰 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js, Express 4, Mongoose 8 (MongoDB), Zod validation, JWT in an httpOnly cookie, node-cron |
| Time handling | Luxon (IANA timezones) |
| Email | SendGrid HTTPS API (Nodemailer only as an optional SMTP fallback) |
| Google sign-in | Firebase Auth on the frontend; the backend verifies tokens with `jsonwebtoken` + `jwks-rsa` (no service account) |
| Frontends | React 18, React Router 6, Vite 5, Axios, lucide-react |
| Hosting | Render (backend), Vercel (both frontends), MongoDB Atlas (database) |

---

## 📁 Project Structure

```
codeyoung/
├── backend/                     Express + MongoDB API
│   ├── src/
│   │   ├── config/              env.js, db.js, googleAuth.js
│   │   ├── controllers/         Request handlers
│   │   ├── middleware/          authGuard, roleGuard, validate, errorHandler
│   │   ├── models/              User, MentorProfile, Booking, AdminConfig, EmailOtp
│   │   ├── routes/              auth, bookings, mentors, admin
│   │   ├── services/            booking, matching, availability, auth, email, ...
│   │   ├── jobs/                reminderJob.js (cron)
│   │   ├── scripts/             seed.js, resetMentorPassword.js
│   │   ├── utils/               timezone, schemas, constants, ...
│   │   ├── app.js               Express app (CORS, routes)
│   │   └── server.js            Entry point
│   ├── .env.example
│   └── package.json
├── frontend-app/                Parent + Mentor React app (port 5173)
│   ├── src/                     components, pages, context, services, utils, config
│   ├── .env.example
│   └── vercel.json
├── frontend-admin/              Admin React app (port 5174)
│   ├── src/
│   ├── .env.example
│   └── vercel.json
└── README.md
```

---

## 🔌 How the Pieces Connect

```
   Parent / Mentor browser                    Admin browser
 https://code-young-nzld.vercel.app     https://code-young-8lim.vercel.app
              │                                     │
              └───────────────┬─────────────────────┘
                              │  HTTPS + cookies (VITE_API_BASE_URL)
                              ▼
              https://codeyoung-1-paui.onrender.com/api   ← Backend (Render)
                    │                    │                    │
                    ▼                    ▼                    ▼
              MongoDB Atlas          SendGrid API      Google public keys
              (MONGO_URI)        (SENDGRID_API_KEY)   (verify Google sign-in)
```

The backend only accepts browser requests from the two frontend URLs (CORS). These are set with `FRONTEND_URL` and `ADMIN_FRONTEND_URL`.

---

## ✅ Requirements

### Software

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | **18 or newer** | Needed for the built-in `fetch` used by the SendGrid call |
| npm | 9 or newer | Comes with Node |
| Git | any | For cloning and deploying |

### Accounts and services

| Service | Needed for | Required? |
|---------|-----------|-----------|
| MongoDB Atlas | Database | Yes |
| SendGrid | Sending emails | Yes (without it, emails are only printed to the server log) |
| Firebase project | "Continue with Google" | Optional (password login works without it) |
| Render | Hosting the backend | For deployment |
| Vercel | Hosting the two frontends | For deployment |

### Package dependencies (installed automatically by `npm install`)

**Backend** (`backend/package.json`)

| Package | Purpose |
|---------|---------|
| `express` | Web server |
| `mongoose` | MongoDB models |
| `cors`, `cookie-parser` | CORS and cookies |
| `jsonwebtoken`, `jwks-rsa` | Login tokens and Google token verification |
| `bcryptjs` | Password hashing |
| `zod` | Request validation |
| `luxon` | Timezone and DST handling |
| `node-cron` | Reminder email job |
| `nodemailer` | Optional SMTP fallback |
| `uuid` | Meeting link ids |
| `dotenv` | Loads `.env` |
| `nodemon` (dev) | Auto-restart in development |

**Frontend App** (`frontend-app/package.json`): `react`, `react-dom`, `react-router-dom`, `axios`, `firebase`, `luxon`, `lucide-react`, plus `vite` and `@vitejs/plugin-react` (dev).

**Admin App** (`frontend-admin/package.json`): `react`, `react-dom`, `react-router-dom`, `axios`, `luxon`, `lucide-react`, plus `vite` and `@vitejs/plugin-react` (dev).

---

## 🔐 Environment Variables

Each of the three projects has its own `.env` file. **Never commit `.env` files.** They are already listed in `.gitignore`. Each project has a `.env.example` you can copy.

> **Vite note (both frontends):** variables are baked in when the app is **built**. On Vercel, after you change an environment variable you must **redeploy** for it to take effect.

### 6.1 Backend (`backend/.env`)

**Production values** (what you set in Render → Environment):

```env
# ---------- Server ----------
PORT=5000
NODE_ENV=production

# ---------- Database (MongoDB Atlas) ----------
# Replace the placeholders with your own Atlas values (see section 8.1).
# The database name "codeyoung" goes right before the "?".
MONGO_URI=mongodb+srv://<db_user>:<db_password>@<cluster-host>/codeyoung?retryWrites=true&w=majority

# ---------- Auth ----------
# Any long random string. Generate one with:
#   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=<long-random-string>
JWT_EXPIRY=7d

# ---------- Google sign-in (Firebase) ----------
# Not a secret. Must match the projectId used in the frontend.
FIREBASE_PROJECT_ID=codeyoung-b618a

# ---------- Email (SendGrid) ----------
SENDGRID_API_KEY=<your-sendgrid-api-key>
# Must be a sender you verified in SendGrid (section 8.2)
EMAIL_FROM=<your-verified-sender@example.com>

# Leave these EMPTY. Not used with SendGrid.
RESEND_API_KEY=
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=

# ---------- Allowed frontends (CORS) ----------
# No trailing slash!
FRONTEND_URL=https://code-young-nzld.vercel.app
ADMIN_FRONTEND_URL=https://code-young-8lim.vercel.app

# ---------- Booking defaults ----------
REMINDER_LEAD_TIME_MINUTES=60
DEFAULT_MAX_CLASSES_PER_MENTOR_PER_DAY=2
SLOT_DURATION_MINUTES=30

# ---------- Signup email code (OTP) ----------
SIGNUP_OTP_EXPIRY_MINUTES=10
SIGNUP_OTP_RESEND_COOLDOWN_SECONDS=60
SIGNUP_OTP_MAX_ATTEMPTS=5

# ---------- Seeding ----------
# Ignored in production. Use "npm run seed" instead (section 7).
AUTO_SEED_ON_STARTUP=false
```

**Local development values** (what you put in `backend/.env` on your computer):

```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/codeyoung      # or your Atlas string
JWT_SECRET=any-long-random-string
JWT_EXPIRY=7d
FIREBASE_PROJECT_ID=codeyoung-b618a
SENDGRID_API_KEY=                                  # blank = emails are printed in the terminal
EMAIL_FROM=<your-verified-sender@example.com>
FRONTEND_URL=http://localhost:5173
ADMIN_FRONTEND_URL=http://localhost:5174
AUTO_SEED_ON_STARTUP=true
```

**Every backend variable explained**

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `PORT` | No | `5000` | Port the API listens on (Render sets this itself) |
| `NODE_ENV` | Yes in production | `development` | `production` turns on secure, cross-site cookies and disables auto-seeding |
| `MONGO_URI` | **Yes** | local MongoDB | MongoDB Atlas connection string |
| `JWT_SECRET` | **Yes** | `dev-secret-change-me` | Secret that signs login tokens. Always change it |
| `JWT_EXPIRY` | No | `7d` | How long a login lasts |
| `FIREBASE_PROJECT_ID` | For Google login | `codeyoung-b618a` | Firebase project id (public) |
| `SENDGRID_API_KEY` | **Yes** for real emails | empty | SendGrid API key |
| `EMAIL_FROM` | **Yes** for real emails | `noreply@codeyoung.example` | "From" address, must be verified in SendGrid |
| `RESEND_API_KEY` | No | empty | **Keep empty.** If set, it is used *instead of* SendGrid |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SERVICE` | No | empty | Old SMTP fallback. **Leave empty.** Only used if neither API key is set |
| `FRONTEND_URL` | **Yes** | `http://localhost:5173` | Exact URL of the parent/mentor app (CORS) |
| `ADMIN_FRONTEND_URL` | **Yes** | `http://localhost:5174` | Exact URL of the admin app (CORS) |
| `REMINDER_LEAD_TIME_MINUTES` | No | `60` | How long before class the reminder is sent |
| `DEFAULT_MAX_CLASSES_PER_MENTOR_PER_DAY` | No | `2` | Default daily class limit per mentor |
| `SLOT_DURATION_MINUTES` | No | `30` | Length of one class slot |
| `SIGNUP_OTP_EXPIRY_MINUTES` | No | `10` | How long the signup code stays valid |
| `SIGNUP_OTP_RESEND_COOLDOWN_SECONDS` | No | `60` | Wait time between "resend code" requests |
| `SIGNUP_OTP_MAX_ATTEMPTS` | No | `5` | Wrong-code attempts before a new code is needed |
| `AUTO_SEED_ON_STARTUP` | No | `false` | Auto-run the seed on start (development only) |

**How the email provider is chosen** (in `emailService.js`, first match wins):

1. `RESEND_API_KEY` is set → Resend
2. `SENDGRID_API_KEY` is set → **SendGrid** ✅
3. `SMTP_SERVICE` or `SMTP_HOST` is set → SMTP
4. Nothing set → emails are only printed in the server log

Because you use SendGrid, make sure `RESEND_API_KEY` is **empty or removed**.

### 6.2 Frontend App (`frontend-app/.env`)

**Production** (Vercel → project `code-young-nzld` → Settings → Environment Variables):

```env
VITE_API_BASE_URL=https://codeyoung-1-paui.onrender.com/api

# Firebase web config (public values, safe in the browser bundle)
VITE_FIREBASE_API_KEY=<from Firebase console>
VITE_FIREBASE_AUTH_DOMAIN=<your-project>.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=codeyoung-b618a
VITE_FIREBASE_STORAGE_BUCKET=<your-project>.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=<from Firebase console>
VITE_FIREBASE_APP_ID=<from Firebase console>
```

**Local development:**

```env
VITE_API_BASE_URL=http://localhost:5000/api
# Firebase values same as above (or leave blank to disable the Google button)
```

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_BASE_URL` | **Yes** | Backend URL **including `/api`** |
| `VITE_FIREBASE_API_KEY` | For Google login | Firebase web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | For Google login | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | For Google login | Must equal the backend's `FIREBASE_PROJECT_ID` |
| `VITE_FIREBASE_STORAGE_BUCKET` | Optional | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Optional | Firebase sender id |
| `VITE_FIREBASE_APP_ID` | For Google login | Firebase app id |

If `VITE_FIREBASE_API_KEY` and `VITE_FIREBASE_APP_ID` are missing, the Google button shows as disabled and password login still works.

### 6.3 Admin App (`frontend-admin/.env`)

**Production** (Vercel → project `code-young-8lim` → Settings → Environment Variables):

```env
VITE_API_BASE_URL=https://codeyoung-1-paui.onrender.com/api
```

**Local development:**

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

The admin app needs only this one variable.

---

## 🚀 Running Locally

Run all three parts in **three separate terminals**. Start the backend first.

### Step 0: Get the code

```bash
git clone <your-repo-url> codeyoung
cd codeyoung
```

### Step 1: Backend (http://localhost:5000)

```bash
cd backend
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# Open .env and fill in at least MONGO_URI and JWT_SECRET (see section 6.1)
npm install
npm run seed                # creates the admin, 10 mentors and default settings (safe to re-run)
npm run dev                 # starts the API with auto-restart
```

You should see `[db] connected to MongoDB` and `[server] CodeYoung backend listening on port 5000`.
Check it at http://localhost:5000/api/health, which should return `{"success":true,"status":"ok"}`.

For a one-off run without auto-restart, use `npm start`.

### Step 2: Frontend App (http://localhost:5173)

```bash
cd frontend-app
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000/api (and Firebase values if you want Google login)
npm install
npm run dev
```

### Step 3: Admin App (http://localhost:5174)

```bash
cd frontend-admin
cp .env.example .env        # Windows PowerShell: copy .env.example .env
# Set VITE_API_BASE_URL=http://localhost:5000/api
npm install
npm run dev
```

Log in at http://localhost:5174/login with the seeded admin account (see [Default Accounts](#-default-accounts)).

### Building for production (optional check)

```bash
cd frontend-app   && npm run build && npm run preview
cd frontend-admin && npm run build && npm run preview
```

---

## 🔧 Third-Party Setup

### 8.1 MongoDB Atlas

1. Create a free cluster at https://www.mongodb.com/atlas.
2. **Database Access** → *Add New Database User* → choose a username and password. Give it read/write access.
3. **Network Access** → *Add IP Address*. Render uses changing IPs, so allow `0.0.0.0/0` (anywhere). This is safe as long as your database user password is strong.
4. **Database** → *Connect* → *Drivers* → copy the connection string:
   ```
   mongodb+srv://<db_user>:<db_password>@<cluster-host>/?retryWrites=true&w=majority
   ```
5. Add the database name `codeyoung` before the `?` and paste it into `MONGO_URI`:
   ```
   mongodb+srv://<db_user>:<db_password>@<cluster-host>/codeyoung?retryWrites=true&w=majority
   ```
6. If your password contains special characters (`@ : / ? # %`), URL-encode them (for example `@` becomes `%40`).

Collections are created automatically the first time the app runs.

### 8.2 SendGrid (emails)

1. Sign up at https://sendgrid.com.
2. **Verify a sender.** Go to *Settings → Sender Authentication → Single Sender Verification*, add the email address you want to send from, and click the link in the verification email. (No domain is needed.)
3. **Create an API key.** Go to *Settings → API Keys → Create API Key* and choose at least **Mail Send** permission. Copy the key. SendGrid shows it only once.
4. Set these in the backend environment:
   ```env
   SENDGRID_API_KEY=<your key>
   EMAIL_FROM=<the exact address you verified in step 2>
   ```
5. Make sure `RESEND_API_KEY` and all `SMTP_*` values are empty.
6. Restart or redeploy the backend.

**What emails get sent:** signup verification code, booking confirmation (to parent and mentor), class reminder, and mentor invite.

**Important:** `EMAIL_FROM` must match the verified sender exactly, or SendGrid rejects the email. If an email doesn't arrive, check the spam folder and the *Activity* page in the SendGrid dashboard.

### 8.3 Firebase (Google sign-in)

Optional. Password login works without it.

1. Go to https://console.firebase.google.com and open (or create) your project.
2. **Authentication → Sign-in method** → enable **Google**.
3. **Project Settings → General → Your apps** → add a **Web app** and copy the config values into the frontend `VITE_FIREBASE_*` variables.
4. **Authentication → Settings → Authorized domains** → add both:
   - `code-young-nzld.vercel.app`
   - `localhost` (already there by default)
5. Set `FIREBASE_PROJECT_ID` in the backend to the same project id.

No service account or private key is required anywhere.

---

## ☁️ Deployment

### Backend on Render

| Setting | Value |
|---------|-------|
| Service type | Web Service |
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | Add every variable from [section 6.1](#61-backend-backendenv) |

After the first deploy, **seed the database once** because auto-seeding is disabled in production. On your own computer, with `backend/.env` pointing at your Atlas database:

```bash
cd backend
npm run seed
```

### Frontend App on Vercel

| Setting | Value |
|---------|-------|
| Root Directory | `frontend-app` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment | Variables from [section 6.2](#62-frontend-app-frontend-appenv) |

### Admin App on Vercel

| Setting | Value |
|---------|-------|
| Root Directory | `frontend-admin` |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Environment | Variables from [section 6.3](#63-admin-app-frontend-adminenv) |

Each frontend has a `vercel.json` that sends every route to `index.html`, so refreshing on any page works.

### Deployment checklist

- [ ] Atlas: database user created and network access allows Render
- [ ] Render: all backend variables set, `NODE_ENV=production`
- [ ] Render: `FRONTEND_URL` and `ADMIN_FRONTEND_URL` match the Vercel URLs exactly (no trailing slash)
- [ ] Render: `SENDGRID_API_KEY` and `EMAIL_FROM` set, `RESEND_API_KEY` empty
- [ ] Vercel (both apps): `VITE_API_BASE_URL` points to the Render URL ending in `/api`
- [ ] Firebase: Vercel domain added to Authorized domains
- [ ] `npm run seed` run once against Atlas
- [ ] https://codeyoung-1-paui.onrender.com/api/health returns `ok`

---

## 👤 Default Accounts

Created by `npm run seed`:

### Admin login

| Field | Value |
|-------|-------|
| **App** | https://code-young-8lim.vercel.app/ |
| **Email** | `admin@coach.edu` |
| **Password** | `@admin123` |

Change this password right after your first login (Admin app → Settings).

### Mentor login (first time)

| Field | Value |
|-------|-------|
| **App** | https://code-young-nzld.vercel.app/ (choose *I am a Mentor*) |
| **Email** | For example, `mentor1@codeyoung.dev` |
| **First-time password** | The same as the email, for example `mentor1@codeyoung.dev` |

Seeded mentors are `mentor1@codeyoung.dev` … `mentor10@codeyoung.dev`. Each one's first password is their own email address. On first login the mentor is forced to set a new password.

### Parent login

Parents sign up themselves in the frontend app (email + password with a 4-digit code, or Google) and log in with the password they chose.

### Resetting a mentor's password

```bash
cd backend
node src/scripts/resetMentorPassword.js mentor1@codeyoung.dev
node src/scripts/resetMentorPassword.js --all
```

---

## 📏 Booking Rules

| Rule | Detail |
|------|--------|
| Free trials per family (lifetime) | Set by the admin (default **5**). Cancelling does **not** give a trial back |
| Free trials per parent **per day** | **2** per class date (in the parent's timezone). Cancelled trials free up the day. Set in `backend/src/utils/constants.js` |
| Full Coaching | Not limited by free-trial rules. Requires child details (name, age/grade, subject, goals, phone) |
| Already-booked times | A time the parent has already booked is removed from their preferred-slot list for that day, and double-booking is blocked by the server |
| Mentor daily limit | Default **2** classes per mentor per day (per-mentor override available) |
| Mentor matching | Active mentors with no conflict who are under their daily limit. The one with the fewest bookings that day is chosen |
| No mentor free | The nearest open slot on the same day is booked and the parent is told |
| Time zones | Stored in UTC, shown in each user's own IANA timezone |
| Blackout dates | Admin can block dates from booking |

---

## 📡 API Reference

Base URL: `https://codeyoung-1-paui.onrender.com/api`

**Public**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/auth/signup` | Start parent signup (sends code) |
| POST | `/auth/signup/verify-otp` | Verify the code and create the account |
| POST | `/auth/signup/resend-otp` | Resend the code |
| POST | `/auth/login` | Parent or mentor login |
| POST | `/auth/google` | Google login or signup |
| POST | `/auth/admin-login` | Admin login |
| POST | `/auth/logout` | Log out |

**Logged in**

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/auth/me` | any | Current user |
| PATCH | `/auth/change-password` | any | Change own password |
| PATCH | `/auth/country` | parent | Save country after Google signup (only while unset) |
| GET | `/mentors/availability?date=YYYY-MM-DD&timezone=...` | parent | Open slots for a date, plus the daily free-trial count |
| POST | `/bookings` | parent | Create a booking |
| GET | `/bookings/me` | parent, mentor | Own upcoming and past bookings |
| PATCH | `/bookings/:id/cancel` | parent, mentor, admin | Cancel a booking |

**Admin only**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/mentors` | List mentors |
| POST | `/admin/mentors` | Create a mentor (sends invite email) |
| PATCH | `/admin/mentors/:id` | Update a mentor |
| GET | `/admin/mentors/:id/schedule` | A mentor's schedule |
| GET | `/admin/config` | Read platform settings |
| PATCH | `/admin/config` | Update platform settings |
| GET | `/admin/bookings` | All bookings |
| GET | `/admin/stats` | Dashboard stats |

---

## 📜 NPM Scripts

**Backend** (`cd backend`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Start with auto-restart (nodemon) |
| `npm start` | Start normally (used on Render) |
| `npm run seed` | Create admin, mentors and settings (safe to re-run) |
| `npm run reset-mentor-password` | Reset mentor passwords (see Default Accounts) |

**Frontend App / Admin App** (`cd frontend-app` or `cd frontend-admin`)

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (port 5173 for the app, 5174 for admin) |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build locally |

---

## 🛠 Troubleshooting

| Problem | Likely cause and fix |
|---------|----------------------|
| First request is very slow | Render free tier was asleep. Wait up to a minute. Scheduled reminder emails only run while the service is awake |
| Browser shows a **CORS error** | `FRONTEND_URL` / `ADMIN_FRONTEND_URL` on Render don't match the site URL exactly. Use `https://code-young-nzld.vercel.app`, **without** a trailing slash, then redeploy |
| Frontend calls `localhost:5000` in production | `VITE_API_BASE_URL` is missing on Vercel. Add it, then **redeploy** |
| Login works but you're logged out on refresh | Check `NODE_ENV=production` on Render and that the CORS URLs above are exact |
| `[db] connection error` | Wrong `MONGO_URI`, wrong password (URL-encode special characters), or Atlas Network Access blocks the server |
| Emails don't arrive | `EMAIL_FROM` is not a verified SendGrid sender, `SENDGRID_API_KEY` is wrong, or `RESEND_API_KEY` is set and overriding SendGrid. Check spam and SendGrid's *Activity* page |
| Emails only appear in the server log | No `SENDGRID_API_KEY` set. That is the development fallback |
| Google button is disabled | `VITE_FIREBASE_API_KEY` / `VITE_FIREBASE_APP_ID` missing |
| Google popup fails on the live site | Add the Vercel domain to Firebase → Authentication → Authorized domains |
| Admin or mentor can't log in on a fresh database | Run `npm run seed` (auto-seed is off in production) |
| "Merge conflict marker" errors | Open the file, delete the `<<<<<<<`, `=======` and `>>>>>>>` lines, keep the correct code, then `git add` and commit |

---

## 🔒 Security Notes

- Never commit `.env` files. They are in `.gitignore`. If a real secret was ever pushed to Git, **rotate it** (new MongoDB password, new SendGrid key, new `JWT_SECRET`).
- Use a long random `JWT_SECRET` in production.
- Change the default admin password (`@admin123`) after first login.
- Signup can only create parent accounts. The server ignores any `role` a client sends.
- Mentors and admins can never self-register.
- Firebase web config values are public by design. Your MongoDB URI, SendGrid key and JWT secret are **not**. Keep them only in Render's environment settings.
