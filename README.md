# SAS DOOR

A door workshop's ERP and its public website in one project. Customers design a door on
the site, carving included, and can even put a carving from their own photo on it. The
shop prices it, follows the work, and keeps its wood stock and suppliers in order.

## 📹 Project Walkthrough Video

[![Watch Video](https://img.shields.io/badge/Watch%20Demo-Google%20Drive-blue?style=for-the-badge&logo=googledrive)](https://drive.google.com/file/d/1mR7eXNGmlQIqw1KeMq4khO1KPCzyRF-q/view?usp=drivesdk)

👉 **Video Link:** [Watch 9-Minute Walkthrough Video](https://drive.google.com/file/d/1mR7eXNGmlQIqw1KeMq4khO1KPCzyRF-q/view?usp=drivesdk)

## 📌 Features

### Website (for customers)
- **Door Designer:** pick single or double, size, wood, door colour, carving and carving colour, and see the door drawn live with its price.
- **Carving from your own photo:** upload a photo of a carved door and mark its four corners. The browser traces the carving and puts it on the customer's door. Tools include a mirror option for symmetric doors, an eraser, and detail/line-thickness sliders.
- **Instant estimate:** a carving nobody has priced yet is estimated from how much work it is (shapes and cut density), placed on the shop's own gallery prices. It's clearly marked as an estimate until the shop confirms it.
- **Customer account:**
  - Orders, each with its whole journey (requested → priced → confirmed → being made → ready → delivered)
  - Price breakdown, payments and due
  - Accept or decline a price
  - A PDF copy of the order
  - Unread-update counts
  - Call / WhatsApp the shop
- Bilingual (English / বাংলা), Book-a-visit, and an editable site content.

### ERP (for the shop)
- **Requests and orders:**
  - Review & price a customer's carving. The boxes start filled with the website's estimate, and the customer's original photo sits next to it with a download.
  - "New" counts for unopened website orders, and lists that refresh themselves.
- **Work sheet:** jobs and crews per order, assigned to workers by skill when an order is confirmed. Progress is visible to the customer, with a notification at each step (and an SMS if a gateway is set).
- **Wood stock in CFT:**
  - Purchases measured as feet+inches, inches, round log (Hoppus) or CBM
  - Batches with repricing
  - Wood taken from stock on confirmation and returned on cancellation only if it was not cut yet
- **Wood maths:** door + frame (chowkath, counted on the outside with its corners) + planing allowance + wastage %. The order page shows what the wastage costs and what the customer pays for it.
- **Price lists:** wood, colours, carvings (15 built-in drawn styles plus traced uploads), labour, profit %, size limits, large-door surcharge.
- **Suppliers:** dues, payments and purchase history. Plus a profit view.

## 🧱 Tech stack

| Part | Stack |
|---|---|
| `frontend/` | Next.js 16 (App Router), React 19, Tailwind 3, TypeScript |
| `backend/` | Node.js, Express 5, TypeScript, Prisma 6, PostgreSQL, zod, JWT |
| Photo → carving | Plain canvas maths in the browser (no OpenCV), traced to SVG with ImageTracer |

```
backend/    API on port 5000. prisma/ has the schema, migrations and seed
frontend/   Website + admin panel on port 3000. src/lib/nokshi/ is the carving engine
render.yaml Render blueprint for the API and database
```

## 🚀 Run it locally

You need Node.js 20+ and PostgreSQL.

```bash
# 1. Backend
cd backend
cp .env.example .env        # then put in your own database URL, JWT secret and admin login
npm install
npm run setup               # applies migrations, generates the Prisma client, seeds prices + admin
npm run dev                 # http://localhost:5000

# 2. Frontend (a second terminal)
cd frontend
cp .env.example .env.local  # NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
npm install
npm run dev                 # http://localhost:3000
```

Sign in at `/login` with the `SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` from `backend/.env`.
`npm run set-admin` resets that password whenever you change it in `.env`.

On Windows, `backend/START-BACKEND.bat` and `frontend/START-SAS-DOOR.bat` do the same with a double-click.

**Updating an existing install:** keep your old `backend/.env` and `backend/uploads/`. Then run
`npx prisma migrate deploy` and `npm run dev`. Migrations only ever add; they never drop data.

## ☁️ Deploy

- **API + database:** Render → New → Blueprint → this repo. It uses `render.yaml`, and the JWT secret is generated for you. Fill in the admin login, `PUBLIC_URL` and `CORS_ORIGINS` on the dashboard.
- **Website:** Vercel, root `frontend/`, with `NEXT_PUBLIC_API_BASE_URL` set to the API's URL.

## 🔒 Security

- Real `.env` files are git-ignored. Only `.env.example` templates are committed, with placeholders. Never put real values in them.
- If a secret has ever been committed or shared, change it: a new `JWT_SECRET` (this signs everyone out) and a new admin password, followed by `npm run set-admin`.
- Uploaded SVGs are sanitised, and `/uploads` is served sandboxed. Customer photos are checked by their file signature.

---

## বাংলায় সংক্ষেপে

**কী:** দরজার কারখানার হিসাবের সফটওয়্যার (ERP) আর ওয়েবসাইট একসাথে। কাস্টমার ওয়েবসাইটে দরজা ডিজাইন করেন, চাইলে নিজের ছবি থেকে নকশা নেন। দোকান দাম ঠিক করে, কাজ ভাগ করে, আর কাঠের স্টক (CFT) ও সাপ্লায়ারের হিসাব রাখে।

**চালাতে:**
1. `backend` ফোল্ডারে `.env` বানান (`.env.example` দেখে), তারপর `npm install`, `npm run setup`, `npm run dev`।
2. `frontend` ফোল্ডারে `.env.local` বানান, তারপর `npm install`, `npm run dev`।
3. ব্রাউজারে `http://localhost:3000` খুলুন।

**আপডেটের পর:** পুরনো `.env` আর `uploads/` রেখে দিন। তারপর `npx prisma migrate deploy` চালান। কোনো ডেটা মুছবে না।

**বিস্তারিত পরিবর্তন:** `backend/CHANGES.md` আর `frontend/CHANGES.md`।
