# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

SAS DOOR is a door-manufacturing shop's ERP plus a public website, in two independent npm projects:

- `backend/`: Node.js, Express 5, TypeScript, Prisma 6 and PostgreSQL. API on port 5000.
- `frontend/`: Next.js 16 (App Router), React 19, Tailwind 3. Runs on port 3000.

The owner reads Bengali. `CHANGES.md` files and READMEs are written in Bangla/Banglish, and UI text is bilingual (en/bn). Windows is the target dev environment.

## Commands

There is no test suite in either project.

Backend (`cd backend`):
- `npm run dev`: runs `prisma generate`, then `tsx watch src/server.ts`
- `npm run build` / `npm start`: compile with `tsc` to `dist/`, then run it
- `npm run db:migrate` (`prisma migrate dev`), `npm run db:deploy` (`prisma migrate deploy`): apply migrations
- `npm run db:seed`: seed default prices and the Super Admin (does not overwrite existing edits)
- `npm run set-admin`: create the Super Admin, or reset its password from `.env`
- `npm run db:studio`: Prisma Studio
- `npm run setup`: deploy migrations, generate the client and seed
- Type-check only: `npx tsc --noEmit`

Frontend (`cd frontend`):
- `npm run dev`: `next dev --webpack` (webpack, not Turbopack)
- `npm run build`, `npm run lint` (ESLint 9 with the next config; `src/lib/nokshi/vendor/**` is ignored)

Env: start from `backend/.env.example` (`DATABASE_URL`, `JWT_SECRET`, `SUPER_ADMIN_*`, `CORS_ORIGINS`, `UPLOAD_DIR`, optional `SMS_*`). The frontend needs `NEXT_PUBLIC_API_BASE_URL` in `.env.local`. When updating an existing install, copy over the old `.env` and `uploads/`, and never overwrite `.env` with the example.

## Backend architecture

- `src/app.ts` mounts three route groups:
  - `/api/auth`: JWT login and register.
  - `/api/public`: website endpoints. These use `optionalAuth`, and `/my/*` needs a login.
  - `/api/admin/*`: one router guarded by `requireAdmin` (role `SUPER_ADMIN`), with each `routes/*.routes.ts` mounted under it.
- `/uploads` is served statically with a sandboxing CSP header. SVGs pass through `lib/svgSanitize.ts`.
- Response envelope: always `{ success, message, data }`, built with `ok()` from `lib/http.ts`. Throw `HttpError`, `bad()` or `notFound()`. `middleware/error.ts` maps them and Prisma errors P2002, P2025 and P2003 to HTTP codes. Validate with zod through `parse(schema, body)`. On PUT/PATCH, wrap the result in `onlySent()` so zod defaults don't overwrite fields the client didn't send.
- Money: Prisma `Decimal` fields reach the client as strings. Do the math with `n()`, `r2()` and `r3()` from `lib/money.ts`. Selling price is `cost × (1 + profit%)`. `resolvePrice` derives profit% when a sell price is typed in instead.
- Multi-step writes run inside `prisma.$transaction` and pass the `Tx` type to lib helpers.
- `server.ts` calls `assertClientMatchesSchema()`, which exits if the generated Prisma client is older than the schema. If you add Estimate columns that new code depends on, consider adding them to `NEEDED` in `config/prisma.ts`.
- Migrations are hand-written and additive (`IF NOT EXISTS`, no `DROP`), so the owner's live data survives. Follow that style.

### Domain rules that span several files

- **Stock** (`lib/stockPlan.ts` is pure planning logic; `lib/stockService.ts` applies it to the DB). Wood is tracked in CFT, as batches per `WoodStock`:
  - A purchase at an equal or higher cost reprices every remaining batch to the new cost, and all of them become ACTIVE.
  - A purchase at a lower cost creates a WAITING batch, which is used after the dearer stock runs out.
  - `sellLocked` keeps a hand-typed selling price unless cost rises above it.
  - A purchase can only be deleted if nothing from its batch has been used.
- **Estimates/orders** (`routes/estimates.routes.ts`, `lib/estimateCalc.ts`):
  - Status flow: `NEW → QUOTED → CONFIRMED → IN_PRODUCTION → READY → DELIVERED → COMPLETED`, plus `CANCELLED`. Status can't move backwards.
  - CONFIRMED consumes stock and records `StockUsage` at the actual cost. CANCELLED returns it.
  - CONFIRMED also auto-assigns work lines to workers by skill (`lib/assignWork.ts`). Customers get notifications (`lib/notify.ts`): a DB row always, plus an SMS when `SMS_URL` is set. An SMS failure must never fail the order.
- **Customer custom carving**: the browser traces the customer's photo into an SVG (`frontend/src/lib/nokshi/`). The server prices it from shape count and coverage only, scaled onto the range of existing design prices (`lib/carvingEstimate.ts`). The server never trusts money values sent by the browser. These orders get `needsQuote`; the admin sends a real price (QUOTED) and the customer accepts it (CONFIRMED).
- Price changes are logged through `lib/priceHistory.ts`.

## Frontend architecture

- `src/lib/api.ts`: `apiRequest` adds the Bearer token from `localStorage.accessToken`. On a 401 it clears the session and redirects to `/login?next=…`.
- `src/lib/erp.ts`: the admin `api.get/post/put/patch/del` wrapper, which unwraps `.data`. Also `uploadFile` (multipart) and formatters: `tk` (৳), `num`, `ftin`, and the `STATUS` label map.
- `src/context/AuthContext.tsx` holds the session. `src/context/LanguageContext.tsx` holds the en/bn language plus admin-editable site content fetched from `/api/public/content` (`lib/siteContent.ts`). Static strings live in `src/messages/{en,bn}.json`.
- Routes: public marketing pages and the `/design` door designer are at the top level. `/dashboard/*` is the customer area. `/admin/*` is the ERP; the main pages are under `admin/door/*` and `admin/supplier/*`, sharing `components/admin/AdminShell.tsx` and the `components/erp/*` widgets.
- `src/lib/measure.ts` converts timber measurements (ft+in, inches, round-log girth, CBM) to CFT, which is the only unit stored.
- `src/services/demoAuth.service.ts` is an in-memory demo that the forgot-password, verify-otp and reset-password pages still use, so password reset is not wired to the backend. Login and register go through `services/auth.service.ts` to `/api/auth`.
- `next.config.js` allows `next/image` to load backend `/uploads/**`, derived from `NEXT_PUBLIC_API_BASE_URL`.
- `frontend/REMOVED-FILES.txt` lists deleted legacy components. Don't recreate them.
