# Cargoplanner — build context (resume here if a session dies)

## Goal
Internal load planner for one company + personal use.

## Stack
Next.js 16 App Router + TS + Tailwind v4, Prisma 6 + PostgreSQL, TypeScript packer in `src/lib/packer.ts`, jose cookie auth, R3F 3D viewer.

## Hosting
Vercel Hobby + Neon free. Guide: HOSTING.md

## Status (this session)
- [x] Scaffold Next.js
- [x] Prisma schema, seed, equipment defaults
- [x] Auth login/logout/settings users
- [x] Loadlists CRUD + 4-step planner
- [x] Cargo grid, Excel paste/import/export
- [x] Packer + Workspace 3D + Load plan print
- [x] Cargo library + equipment
- [x] HOSTING.md
- [x] Verify `npx tsc` and `npm run build` (passed)
- [x] Packer smoke: 44 pieces into one 40HC in ~6ms
- Local `prisma db push` needs Docker Postgres or a Neon URL (Docker not installed on this machine)

## Default local login
admin@local / admin123 via .env

## Caps
1200 pieces, 40 containers, 10mm min space, Vercel 10s hobby timeout.
