# Rosuighor (রসুইঘর)

Bachelor meal tracking and expense management system for shared apartments and bachelor messes. Supports Web and Mobile (Android / iOS) platforms with bilingual support (English and Bengali) and light/dark themes.

---

## Features

- **Authentication**: Sign up with real email verification (6-digit code), sign in, and forgot/reset password by email. Emails are bilingual (follow the user's language) and branded with the রসুইঘর logo.
- **Installable PWA**: Web manifest + service worker (offline app shell, install button, offline banner).
- **Homes & Groups**: Create a home group and invite members via Telegram-style shareable links (`?join=HOME-XXXXXX`).
- **Mess Cycles**: Default 10-day customizable cycles. Any home member can start a new cycle.
- **Meal Tracking**: Quick daily meal toggle (Breakfast, Lunch, Dinner, Guest) and full cycle meal matrix.
- **Expenses & Deposits**: Log shared bazaar purchases and track cash deposits per member.
- **Live Calculations**:
  - `Meal Rate = Total Bazaar Cost ÷ Total Meals`
  - `Member Cost = Individual Meals × Meal Rate`
  - `Balance = Deposits - Cost` (Surplus or Due)

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite
- **Mobile**: React Native, Expo
- **Backend**: Node.js, Express, TypeScript
- **Database**: PostgreSQL 16 (Dockerized)

---

## Getting Started

### 1. Database

Start the PostgreSQL container:

```bash
docker compose -f Database/docker-compose.yml up -d
```

- **Host Port**: `5435`
- **Database**: `রসুইঘর`
- **User**: `postgres`
- **Password**: `Iffat25082002`

The schema is automatically initialized from `Database/init.sql`.

### 2. Backend

```bash
cd Backend
npm install
npm run dev
```

- Copy `Backend/.env.example` to `Backend/.env` and fill it in.
- Server runs on `http://localhost:5000`
- Schema changes are applied automatically on startup (`src/config/schema.ts`).

#### Email (SMTP)

Without SMTP settings (development), emails are **printed to the backend console** instead of being sent, so you can copy the code from there. In production (`NODE_ENV=production`) SMTP is required.

Gmail setup:
1. Turn on 2-Step Verification on the Google account.
2. Create an App Password at https://myaccount.google.com/apppasswords.
3. In `Backend/.env`:
   ```env
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=you@gmail.com
   SMTP_PASS=your16charapppassword
   MAIL_FROM="রসুইঘর (Rosuighor) <you@gmail.com>"
   CLIENT_URL=https://your-frontend-url
   ```
Any SMTP provider works (Brevo, Mailgun, SES, Zoho…). Set the same variables on your hosting provider for production.
- Health check: `http://localhost:5000/api/health`

### 3. Web Frontend

```bash
cd Frontend
npm install
npm run dev
```

- Accessible at `http://localhost:5173`

### 4. Mobile App

```bash
cd MobileApp
npm install
npx expo start
```

- Run on Android: `npx expo start --android`
- Run on iOS: `npx expo start --ios`

---

## Environment Variables

### Backend (`Backend/.env`)

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5435
DB_NAME=রসুইঘর
DB_USER=postgres
DB_PASSWORD=Iffat25082002
JWT_SECRET=rosuighor_super_secret_key_iffat_25082002
```

---

## API Summary

| Endpoint | Method | Description |
|---|---|---|
| `/api/auth/signup` | POST | Register new user |
| `/api/auth/signin` | POST | User login |
| `/api/auth/me` | GET | Current user profile |
| `/api/homes` | GET / POST | List or create homes |
| `/api/homes/invite/:code` | GET | Preview invite code |
| `/api/homes/join` | POST | Join home via invite code |
| `/api/mess/home/:homeId` | GET | Get mess cycles |
| `/api/mess` | POST | Create new mess cycle |
| `/api/meals/:messId` | GET / POST | Get or update meal records |
| `/api/bazaar/:messId` | GET / POST | Get or add bazaar expenses |
| `/api/deposits/:messId` | GET / POST | Get or add cash deposits |
| `/api/summary/:messId` | GET | Calculate live meal rate & settlements |
