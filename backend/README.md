# SAS DOOR Backend (Zip 1 / 3)

Node.js + Express 5 + TypeScript + Prisma + PostgreSQL.

## Install (Windows)

```powershell
# 1. Purono backend backup
Rename-Item F:\sasdoor-backend sasdoor-backend-old

# 2. Zip ta extract korun, tarpor:
cd F:\sasdoor-backend
powershell -ExecutionPolicy Bypass -File .\setup.ps1

# 3. Server
npm run dev
```

### Notun folder e shudhu update korle

`.env` ar `uploads/` git-ignored, tai zip e thake na. Purono folder theke dutoi copy
korun — tahole database, login ar age upload kora noksha shob thik thakbe:

```powershell
Copy-Item "F:\sasdoor-backend\.env"     ".\.env" -Force
Copy-Item "F:\sasdoor-backend\uploads"  ".\uploads" -Recurse -Force
npm install      # prisma generate nijei cholbe (postinstall)
npm run dev
```

> `.env` copy korar **pore** `Copy-Item .env.example .env` chalaben na — ota asol
> `.env` ke example diye muche dey, ar tokhon DATABASE_URL e `YOUR_DB_PASSWORD`
> boshe thake.

`.env` e **notun database naam** din (jemon `sasdoor_erp`), tahole purono database er data thik thakbe. Prisma nijei database toiri korbe.

## Commands

| Command | Kaj |
|---|---|
| `npm run dev` | Server chalu (http://localhost:5000) |
| `npm run build` / `npm start` | Production build / chalu |
| `npm run db:seed` | Default dam abar boshano (ager edit mushe na) |
| `npm run db:studio` | Browser e database dekha |

## API

Shob response: `{ success, message, data }`. Takar field gula string hishebe ashe (Decimal), frontend e `Number()` kore niben.

**Auth** `/api/auth`: `POST /register`, `POST /login` (`{ login: email/phone, password }`), `GET /me`, `PATCH /me`, `POST /change-password`. Token: header `Authorization: Bearer <token>`.

**Public** `/api/public` (login lage na):
`GET /designer` (stock e ache emon kath, color, nokshi, settings: shudhu bikri dam) · `POST /quote` · `POST /orders` · `POST /book-visit` · `GET /content?page=home` · `GET /my/estimates` ar `GET /my/visits` (login lage)

**Admin** `/api/admin` (shudhu Super Admin):

| Path | Kaj |
|---|---|
| `/settings` | GET, PUT: thickness, chowkath, wastage, size shima, boro door %, default profit %, company |
| `/wood-types` | 29 kath list: GET, POST, PUT, DELETE |
| `/suppliers` | CRUD, `GET /:id/ledger`, `POST /:id/payments`, `DELETE /payments/:id` |
| `/purchases` | GET (filter), `POST /preview` (live hishab + Active/Waiting), POST (Opening Stock o), PATCH (payment/note), DELETE (stock theke o bad) |
| `/stock` | GET, `GET /:id` (batch + price history), `PUT /:id` (profit % ba bikri dam) |
| `/colors` `/designs` `/labour` | CRUD, kena + profit % = bikri (ba bikri dile % auto), `GET /:id/history` |
| `/estimates` | `POST /quote` (kena+bikri+labh), POST, GET, `GET /:id`, PUT (shudhu NEW), `PATCH /:id/status`, `POST /:id/payments`, `DELETE /payments/:id` |
| `/customers` | GET (mot/paid/baki), `GET /:id`, POST, PUT |
| `/content` | Website lekha/chobi: GET, PUT (`items[]`), DELETE |
| `/visits` | Book visit request: GET, PATCH status |
| `/upload` | `file` field e chobi/SVG (5MB) |

## Stock er niyom

- Notun kena dam **soman ba beshi**: baki shob batch notun dame, shob ACTIVE.
- Notun kena dam **kom**: notun batch WAITING, ager ta shesh hole chalu (beshi damer WAITING aage).
- Estimate **CONFIRMED** hole kath kate (StockUsage e ashol kena dam save), **CANCELLED** hole ferot.
- Kena entry delete shudhu jodi oi batch theke kichu use na hoye thake.
