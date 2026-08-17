# Cargoplanner

Internal load planner: cargo grid → equipment → 3D pack → printable plan.

## Local run

1. Copy `.env.example` to `.env`
2. Start Postgres: `docker compose up -d`
3. `npm install`
4. `npx prisma db push`
5. `npx prisma db seed`
6. `npm run dev` → http://localhost:3000

Login: `admin@local` / `admin123` (change these in `.env` before hosting).

Deploy: see [HOSTING.md](HOSTING.md).
