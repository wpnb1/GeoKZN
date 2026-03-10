# GeoKZN backend (PostgreSQL)

## Requirements

- PostgreSQL 14+ running locally (or remote)
- Node.js 18+

## Setup

1. Create `backend/.env` from `backend/.env.example`
2. Install deps:

```bash
cd backend
npm install
```

3. Run migrations + seed:

```bash
cd backend
npm run db:migrate
```

4. Start API:

```bash
cd backend
npm run dev
```

The API listens on `PORT` (default `4000`).

## Expo client config

Set env variable in your Expo app:

- `EXPO_PUBLIC_API_URL=http://<YOUR_PC_IP>:4000`

Then restart the Expo dev server.

