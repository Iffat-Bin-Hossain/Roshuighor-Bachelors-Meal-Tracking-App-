# Rosuighor (রসুইঘর)

Bachelor meal tracking and expense management system for shared apartments and bachelor messes. Supports Web and Mobile (Android / iOS) platforms with bilingual support (English and Bengali) and light/dark themes.

---

## Features

- **Authentication**: Sign up and sign in with email validation, flexible usernames, and secure passwords.
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

- Server runs on `http://localhost:5000`
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
