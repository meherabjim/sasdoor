# SAS DOOR — Backend পরিবর্তন

**ধাপ ৬ — কাস্টমারের নকশা, Review ও অর্ডার**
তারিখ: ২২ সেপ্টেম্বর ২০২৬

---

## ⚠️ Migration চালাতে হবে

```
cd F:\sasdoor-backend
npx prisma migrate deploy
npm run dev
```

`20260922000000_customer_quote_flow` — **কোনো `DROP` নেই**, সব `IF NOT EXISTS`:

| কী | কেন |
| --- | --- |
| `EstimateStatus` + `QUOTED` | দাম পাঠানো হয়েছে, কাস্টমারের রাজি হওয়ার অপেক্ষা |
| `Estimate.customDesignSvg` | কাস্টমারের নিজের ছবি থেকে তোলা নকশা |
| `Estimate.customDesignName` | তার নাম |
| `Estimate.needsQuote` | এই দামটা এখনো আমাদের দেওয়া দাম নয় |
| `Estimate.quotedAt` | কখন চূড়ান্ত দাম পাঠানো হলো |

> **নকশাটা estimate-এর ভেতরেই রাখা হয়েছে, DoorDesign সারি হিসেবে নয়** — নইলে ওয়েবসাইট আপনার গ্যালারিতে সারি লিখতে পারত, আর বাতিল হওয়া প্রতিটা অনুরোধ একটা করে আবর্জনা রেখে যেত।

---

## নতুন ফাইল: `src/lib/carvingEstimate.ts`

কেউ কোনোদিন দাম বসায়নি এমন নকশার আনুমানিক দাম।

- `workScore(shapes, coverage)` → ০..১ (আকৃতির সংখ্যা ৬০%, coverage ৪০%)
- `onGalleryScale(score, prices)` → আপনার সবচেয়ে কম ও বেশি দামের **মধ্যেই** একটা সংখ্যা

**টাকা ব্রাউজার থেকে নেওয়া হয় না** — শুধু আকৃতির সংখ্যা আর coverage আসে, বাকিটা সার্ভার আপনার নিজের সারি থেকে পড়ে।

---

## নতুন route

| Route | কাজ |
| --- | --- |
| `POST /api/public/quote` (বর্ধিত) | `custom` নিলে আনুমানিক নকশার লাইন যোগ করে, `estimated: true` ফেরত দেয় |
| `POST /api/public/orders` (বর্ধিত) | নকশাটা estimate-এ রাখে, `needsQuote` তোলে |
| `POST /api/admin/estimates/:id/quote` | **Review** — চূড়ান্ত নকশার দাম, লাইন ও মোট নতুন করে বসায়, status → `QUOTED` |
| `POST /api/public/my/estimates/:id/accept` | কাস্টমার রাজি → `CONFIRMED`, তখনই স্টক কাটে |
| `DELETE /api/admin/designs/:id` (বদল) | ব্যবহার না হলে **সত্যিই মুছে**, হলে লুকিয়ে রাখে |

## status প্রবাহ

```
NEW ─(কাস্টমারের নিজের নকশা)→ QUOTED ─(কাস্টমার রাজি)→ CONFIRMED → ...
```

`QUOTED`-এ স্টক অক্ষত, ঠিক `NEW`-এর মতোই। `FLOW` তালিকায় `QUOTED` বসানো হয়েছে যাতে পেছনে যাওয়া আটকায়।

---

## পরীক্ষা

আসল route handler-এ in-memory database চালিয়ে **৬০টা টেস্ট** (পুরনো ৩১ + নতুন ২৯) — সব pass:

- আনুমানিক দাম বিস্তারিত বাড়লে বাড়ে, গ্যালারির সীমা ছাড়ায় না
- পাবলিক API-তে খরচ/লাভ একটাও যায় না
- Review-এর পর আন্দাজি লাইন উঠে গিয়ে আসল দাম বসে, মোট মেলে
- অন্যের estimate কেউ accept করতে পারে না
- ব্যবহৃত নকশা মুছে যায় না, লুকিয়ে থাকে

---
---

# SAS DOOR — Backend পরিবর্তন

**ধাপ ৫ — আগাম টাকা, নিজস্ব উৎপাদন, KG বাদ**
তারিখ: ২২ সেপ্টেম্বর ২০২৬

---

## ⚠️ Migration লাগবে না

Database schema-তে **একটাও বদল নেই**। `MeasureMode.KG` enum আর `WoodType.densityKgPerCft` column ইচ্ছা করে রাখা হয়েছে, যাতে আগের এন্ট্রিগুলো পড়া যায়। শুধু নতুন এন্ট্রিতে আর গ্রহণ করা হয় না।

```
cd F:\sasdoor-backend
npm run dev
```

---

## ১. `suppliers.routes.ts`

### ক. আগাম না পেমেন্ট — সিদ্ধান্ত এখন এখানেই হয়

আগে frontend `type` পাঠাত। কিন্তু **frontend জানতেই পারে না** — এটা নির্ভর করে টাকা পৌঁছানোর ঠিক আগের মুহূর্তে খাতা কী অবস্থায় ছিল তার উপর।

```ts
const before = await supplierBalance(supplierId);
const type = before.payable > 0 ? "PAYMENT" : "ADVANCE";
```

৫০,০০০ বাকির বিপরীতে ৮০,০০০ = **PAYMENT** (যার ৩০,০০০ আগাম হয়ে থাকে), আগের মতো "ADVANCE ৮০,০০০" নয়।

> label কখনোই হিসাব নাড়ায় না — খাতা সবসময় *মোট চালান − মোট দেওয়া*। এটা শুধু খাতাকে সত্যি কথা বলায়।

### খ. `balances()` — নিজের কল কখনো পাওনাদার নয়

`kind === "OWN"` হলে **due / payable / advance তিনটেই শূন্য**। `totalPurchase` থাকে — কত উৎপাদন হয়েছে সেই হিসাব।

আগে নিজের কারখানার প্রতিটা এন্ট্রি সাপ্লায়ার খাতায় বাকি তুলত — এমন বাকি যা কোনোদিন শোধ করা যায় না।

### গ. সব সাপ্লায়ার এখন সারি পায়

কোনো লেনদেন না থাকলেও — নতুন সাপ্লায়ারকে ঠিক তখনই তো আগাম দিতে হয়।

### ঘ. নতুন গার্ড

- নিজের কারখানায় payment/advance → `400` "nobody to pay"
- OWN সাপ্লায়ার বানানোর সময় advance → `400`

### ঙ. Ledger

OWN হলে `own: true`, আর তিনটে টাকার সংখ্যাই শূন্য। উৎপাদনের সারিগুলো তালিকায় থাকে।

---

## ২. `purchases.routes.ts`

### ক. নিজস্ব উৎপাদন সাথে সাথেই নিষ্পত্তি

```ts
const own = supplier?.kind === "OWN";
let paidHere = own ? m.totalCost : b.paidAmount;
```

খরচ আসল, স্টকেও ঠিক ওই দামে ঢোকে — কিন্তু **বাকি তৈরি হয় না**।

### খ. চালান মুছলে দেওয়া টাকা আর হারায় না ← সবচেয়ে গুরুতর সংশোধন

আগে `DELETE` খরচের লাইন আর দেওয়া টাকার লাইন **দুটোই** মুছে দিত। ১,২০,০০০ দিয়ে আনা চালান মুছলে ওই টাকার চিহ্নও থাকত না।

এখন ওই টাকাটা **ADVANCE** হয়ে সাপ্লায়ারের কাছে থাকে, note-এ কোন চালান থেকে এসেছে লেখা সহ। নিজের কারখানার ক্ষেত্রে কিছুই রাখা হয় না (খাতাই নেই)।

### গ. `PATCH` আর `POST` এখন একই নিয়মে

বেশি টাকা → `extraAsAdvance` দিলে আগাম হিসেবে রাখা হয়, নইলে `400`। আগে PATCH শুধু মানা করত।

### ঘ. `measureMode` থেকে `KG` বাদ

zod আর গ্রহণ করে না। Prisma enum-এ রয়ে গেছে, তাই পুরনো সারি পড়া যায়।

---

## ৩. `woodTypes.routes.ts`

`densityKgPerCft` রাখা হয়েছে (পুরনো ডেটার জন্য), কিন্তু কোনো পর্দা আর পাঠায় না।

---

## পরীক্ষা

আসল route handler-গুলো একটা in-memory database-এর উপর চালিয়ে **৩১টা পরীক্ষা** — সবগুলো pass:

- CHANGES-এর করিম টিম্বার উদাহরণটা ধাপে ধাপে (২ লাখ আগাম → দুই চালান → বাকি শোধ)
- ৮০,০০০ বনাম ৫০,০০০ বাকি → PAYMENT হিসেবে লেখা
- চালান মুছলে দেওয়া টাকা আগাম হয়ে টিকে থাকে
- POST আর PATCH দুটোতেই বেশি টাকার একই নিয়ম
- নিজের কারখানা: বাকি নেই, আগাম নেই, পেমেন্ট নেওয়া হয় না, উৎপাদনের হিসাব থাকে
- লেনদেনহীন নতুন সাপ্লায়ারও তালিকায় আসে

---
---

# SAS DOOR — Backend পরিবর্তন

**ধাপ ২ + ধাপ ৩ — সাপ্লায়ারের ধরন, মাপের একক, ছবি থেকে নকশা**
তারিখ: ১৮ সেপ্টেম্বর ২০২৬

> ধাপ ১-এর (আগাম টাকা) বিবরণ এই ফাইলের একদম নিচে রাখা আছে।

---

## ⚠️ চালানোর আগে

### ১. `.env` বানান

`.env.example` কপি করে `.env` নাম দিন, তারপর `DATABASE_URL`-এ নিজের postgres পাসওয়ার্ড বসান। বাকি সব আগে থেকেই ভরা আছে — নতুন `JWT_SECRET` আর নতুন সুপার অ্যাডমিন পাসওয়ার্ড সহ।

> **পুরনো `JWT_SECRET` আর পাসওয়ার্ড দুটোই ফাঁস হয়ে গিয়েছিল** (আগের zip-এ `.env` চলে গিয়েছিল)। `.env.example`-এ যেগুলো আছে সেগুলো নতুন, কিন্তু এগুলোও এই চ্যাটে আছে — লাইভে যাওয়ার আগে আরেকবার বদলে নেবেন।

### ২. Migration চালান

```
cd F:\sasdoor-backend
npm install
npx prisma migrate deploy
npx prisma generate
```

`3 migrations found` দেখার কথা। **`prisma generate` না চালালে server চালু হবে না।**

Migration-টা বড় — সাতটা অংশ। সব নতুন column-এ default আছে, তাই একটা row-ও নষ্ট হয় না, আর দুটো কাজ নিজে থেকেই হয়ে যায়: পুরনো `FOREIGN` সাপ্লায়ার → `INTERNATIONAL`, আর পুরনো estimate-এ নকশার ছবি বসানো। তবু **আগে একটা backup নিয়ে রাখবেন।**

### ৩. সুপার অ্যাডমিন বসান

```
npm run set-admin
```

`.env`-এর `SUPER_ADMIN_EMAIL` আর `SUPER_ADMIN_PASSWORD` দিয়ে অ্যাকাউন্টটা বানায় — **আর আগে থেকে থাকলে পাসওয়ার্ড বদলে দেয়।**

> এটা নতুন, আর দরকার ছিল। `npm run db:seed` অ্যাকাউন্ট আগে থেকে থাকলে হাতই দেয় না (`if (!exists)`), তাই `.env`-এ পাসওয়ার্ড বদলে seed চালালে কিছুই হতো না — অথচ পাসওয়ার্ড ফাঁস হলে সেটাই দরকার।
>
> Script-টা দুর্বল পাসওয়ার্ড ফিরিয়ে দেয়: ১০ অক্ষরের কম, বা `change`/`example`/`password` জাতীয় লেখা থাকলে চলবে না।

## ১. সাপ্লায়ারের তিন ধরন

`Supplier.kind` = **Local / International / Own manufacture**।

**Own manufacture হুবহু Local-এর মতোই চলে** — invoice আছে, LC নেই, দেশ Bangladesh, দাম আছে, খাতাও আছে। পার্থক্য শুধু নামে, যাতে তালিকা দেখেই বোঝা যায় কোনটা কেনা কাঠ আর কোনটা নিজের কারখানার।

### কেন `SourceType`-এ তৃতীয় option বানাইনি

`SourceType` দুটো কাজ একসাথে করছে — সাপ্লায়ারের ধরন, আর **স্টকের চাবি**:

```
WoodStock  @@unique([woodTypeId, source])
WoodType   @@unique([nameEn, source])
```

`OWN` কে তৃতীয় source বানালে নিজের কারখানার সেগুন আর কেনা সেগুন **দুটো আলাদা স্টক, আলাদা দাম** হয়ে যেত, আর প্রতিটা কাঠ দুবার বসাতে হতো। তাই `kind` আলাদা field, আর Own supplier-এর `source` LOCAL-ই থাকে।

এর ফলে **স্টকের কোডে একটা লাইনও বদলাতে হয়নি** — `WoodPurchase.source` আগে থেকেই কাঠের ধরন থেকে আসে, সাপ্লায়ার থেকে না।

### সাপ্লায়ার বানানোর সময়ই আগাম

`POST /api/admin/suppliers` এখন ঐচ্ছিক `advance` আর `advanceMethod` নেয়। করিম টিম্বার যোগ করলেন আর তখনই ২ লাখ দিলেন — এক জায়গাতেই হয়ে যাবে, আলাদা পাতায় যেতে হবে না।

---

## ২. মাপের একক

`WoodPurchase`-এ দুটো নতুন ঘর:

| ঘর | কী রাখে |
| --- | --- |
| `measureMode` | CFT / FT_IN / INCH / GIRTH / KG |
| `measureRaw` | কাঁচা এন্ট্রি — প্রতিটা সারি, বা ওজন আর ঘনত্ব |

**জমা সবসময় CFT-তেই** — পুরো স্টক আর দামের হিসাব CFT-base, ওটা ভাঙা হয়নি। `measureRaw` শুধু এই প্রশ্নের উত্তর দেওয়ার জন্য: "এই ২৮.৫ CFT কোথা থেকে এল?"

`WoodType.densityKgPerCft` — ওজনে চালান তুললে লাগে। না দিলে KG mode বন্ধ থাকবে।

### চালানে বেশি টাকা দিলে

আগে মোট খরচের চেয়ে বেশি দিলে সরাসরি error দিত। এখন `extraAsAdvance: true` পাঠালে বাড়তিটা **ওই সাপ্লায়ারের আগাম** হিসেবে বসে যায়। চালানের লাইনে এখনো বেশি বসে না — ওটা ঠিকই আছে, বাড়তি টাকা কোনো এক চালানের সাথে বাঁধা নয়।

---

## ৩. ছবি থেকে নকশা

### ১৫টার সীমা ভাঙা হয়েছে

আগে প্রতিটা নকশার `key` অবশ্যই `render.js`-এর ঐ ১৫টার একটা হতে হতো, আর `key` unique। মানে **১৫টার বেশি নকশা রাখাই যেত না**, আর একটা মুছে দিলে (soft delete) তার key চিরতরে আটকে থাকত।

এখন আপলোড করা নকশা নিজের key পায় (`custom-<সময়>-<এলোমেলো>`), তাই যত খুশি রাখা যাবে।

### নতুন দুটো ঘর

| ঘর | মানে |
| --- | --- |
| `origin` | `BUILTIN` (render.js আঁকে) / `UPLOADED` (trace করা ছবি) |
| `visibility` | `PRIVATE` (শুধু ওই estimate-এ) / `LIBRARY` (গ্যালারিতে সবার) |

`Estimate.designSvgUrl` — নকশার ছবিটা estimate-এ জমে যায়, তাই পরে নকশা মুছলেও পুরনো estimate-এর ছবি ভাঙে না।

### API-তে কী নতুন

```
GET   /api/admin/designs?visibility=LIBRARY&include=12
PATCH /api/admin/designs/12/visibility   { "visibility": "LIBRARY" }
```

`include` দিয়ে একটা নির্দিষ্ট নকশা filter-এর বাইরে থেকেও আনা যায় — এভাবেই PRIVATE নকশাটা তার নিজের estimate-এ দেখা যায়।

পাবলিক ডিজাইনার (`/api/public/designer`) এখন **শুধু LIBRARY নকশা** দেখায়। কাস্টমারের ছবি ওয়েবসাইটে ফাঁস হবে না।

---

## ৪. নিরাপত্তা — SVG

এটা জরুরি ছিল। SVG একটা **document**, ছবি না — ভেতরে `<script>` আর event handler থাকতে পারে। আর `/uploads` সরাসরি disk থেকে serve হয়, মানে ওখানে রাখা যেকোনো SVG এই origin-এ চলে।

দুটো স্তর বসেছে:

1. **`src/lib/svgSanitize.ts`** — প্রতিটা আপলোড করা `.svg` সংরক্ষণের **আগেই** পরিষ্কার হয়। Allowlist ভিত্তিক: শুধু আমাদের চেনা আকৃতির tag আর attribute টেকে, বাকি সব বাদ। `<script>`, `on*`, `javascript:`, বাইরের `url()`, `<!DOCTYPE>` — কিছুই পার পায় না।
2. **`/uploads`-এ হেডার** — `Content-Security-Policy: sandbox` আর `X-Content-Type-Options: nosniff`। কেউ সরাসরি ফাইলটা খুললেও ভেতরে কিছু চলবে না।

---

## ফাইল ধরে ধরে

| ফাইল | কী বদলেছে |
| --- | --- |
| `prisma/schema.prisma` | চারটে নতুন enum; `Supplier.kind`, `WoodType.densityKgPerCft`, `WoodPurchase.measureMode/measureRaw`, `DoorDesign.origin/visibility`, `Estimate.designSvgUrl` |
| `prisma/migrations/20260918150000_…` | **নতুন** migration |
| `src/lib/svgSanitize.ts` | **নতুন** — SVG পরিষ্কারক |
| `src/routes/suppliers.routes.ts` | `kind` ↔ `source` মেলানো, সাপ্লায়ার বানানোর সময় আগাম |
| `src/routes/purchases.routes.ts` | measure mode + raw, বাড়তি টাকা আগাম হিসেবে রাখা |
| `src/routes/woodTypes.routes.ts` | ঘনত্ব |
| `src/routes/prices.routes.ts` | নকশার origin/visibility, নিজের key, gallery filter, LIBRARY-তে তোলা |
| `src/routes/estimates.routes.ts` | নকশার ছবি estimate-এ জমা |
| `src/routes/public.routes.ts` | পাবলিকে শুধু LIBRARY নকশা |
| `src/routes/upload.routes.ts` | SVG sanitize |
| `src/app.ts` | `/uploads`-এ নিরাপত্তার হেডার |
| `src/routes/auth.routes.ts` | register-এ অ্যাকাউন্ট দখল বন্ধ |
| `src/routes/customers.routes.ts` | হাতে অ্যাকাউন্ট জোড়ার endpoint, `accountWaiting` flag |
| `src/lib/stockPlan.ts` | `replayCost`, `promote` আর দাম বাড়ায় না |
| `src/lib/stockService.ts` | চালান মুছলে দাম ফেরত, `sellLocked`, `r3()` |
| `src/routes/stock.routes.ts` | হাতে দাম লিখলে lock হয় |
| `src/lib/estimateCalc.ts` | `crew` আর `crewTotal` |
| `prisma/setAdmin.ts` | **নতুন** — `npm run set-admin` |
| `.env.example` | নতুন JWT_SECRET আর সুপার অ্যাডমিন |

---

## যা যাচাই করতে পারিনি

`prisma generate` এখনো চালানো যায়নি (engine download blocked)। উপরের ৮ নম্বরে যে দুটো উপায়ে যাচাই করেছি সেগুলো অনেকটা ধরতে পারে, কিন্তু সব নয় — Prisma-র নিজের query typing (`where`, `include`, `select`-এর ভেতরের field নাম) যাচাই হয়নি। আপনার মেশিনে `npx prisma generate` চালানোর পর `npm run build` একবার দিয়ে দেখবেন।

---

## ৫. অ্যাকাউন্ট দখলের ফাঁক বন্ধ

**এটাই সবচেয়ে জরুরি ছিল।** আগে register করার সময় ফোন নম্বর মিলিয়ে customer record-টা নতুন অ্যাকাউন্টের সাথে জুড়ে দেওয়া হতো, আর নাম-ঠিকানাও বদলে দিত।

মানে অ্যাডমিন যে walk-in customer-টা ফোন নম্বর দিয়ে বসিয়েছিলেন, **সেই নম্বর দিয়ে যে কেউ account খুললেই তার সব estimate, দাম আর বাকি দেখতে পেত।** ফোন verify হয় না — OTP-র পর্দাগুলো তো নকল।

এখন:

- যে নম্বরে কোনো ইতিহাস নেই → সাথে সাথেই জুড়বে
- যে নম্বরে আগের estimate আছে → **জুড়বে না**। অ্যাকাউন্ট ঠিকই তৈরি হবে, শুধু পুরনো অর্ডার দেখাবে না
- নাম-ঠিকানা আর কখনো register থেকে বদলাবে না

দোকান নিজে মিলিয়ে দেখে জুড়ে দেবে — Customers পাতায় নতুন `PATCH /api/admin/customers/:id/link-account`। তালিকায় `accountWaiting` flag আসে, তাই কে অপেক্ষা করছে সেটা দেখা যায়।

---

## ৬. স্টকের তিনটে ফাঁক

**১. চালান মুছলে বাড়া দাম এখন ফেরে।** আগে দামি চালান বাকি সব batch-এর দাম বাড়িয়ে দিত, আর চালানটা মুছে দিলে কাঠ চলে যেত কিন্তু **দাম বাড়া রয়ে যেত**। প্রতিটা batch-এ নিজের `originalCost` রাখা আছে, তাই এখন যা বাকি আছে তাদের উপর নিয়মটা আবার চালিয়ে দাম নতুন করে বসানো হয় (`replayCost`)।

**২. হাতে বসানো দাম এখন টেকে।** আগে হাতে ৳৫২০ লিখলে সেটা একটা profit%-এ বদলে যেত, আর পরের চালানে ঐ % নতুন cost-এ বসে দাম নিজে নিজে ৳৮৩২ হয়ে যেত। এখন `WoodStock.sellLocked` — হাতে লেখা দাম **একটা সংখ্যা হিসেবেই** থাকে।

> শুধু একটা ব্যতিক্রম: cost যদি আপনার দেওয়া দাম ছাড়িয়ে যায়, তখন দাম উঠবে — খরচের নিচে বিক্রি করাটা আপনার সিদ্ধান্ত বদলানোর চেয়েও খারাপ হতো। price history-তে কারণটা লেখা থাকবে।

**৩. অর্ডার ক্যানসেলে দাম আর বাড়ে না।** `promote()` সব ACTIVE batch-এর সবচেয়ে বেশি দামটা নিত। কাঠ ফেরত এলে পুরনো দামি batch জেগে উঠে বিক্রির দাম বাড়িয়ে দিতে পারত। এখন দাম কখনো উপরে ওঠে না, শুধু নামে।

সাথে `returnForEstimate`-এ `r2()` → `r3()` — schema `Decimal(12,3)`, তাই ফেরত দিলে তৃতীয় দশমিক হারাচ্ছিল।

---

## ৭. কতজন লোক, কত দিন

`DoorDesign` আর `LabourRate` দুটোতেই চারটে নতুন ঘর — `workersSingle/Double`, `daysSingle/Double`।

**দামের হিসাবে এর কোনো ভূমিকা নেই** — শুধু দেখানোর জন্য। তাই পুরনো estimate-এর দাম এক পয়সাও নড়বে না। বড় দরজাতেও লোক বাড়ে না (২০% বেশি দাম মানে ২০% বেশি লোক নয়)।

Quote-এ দুটো নতুন জিনিস আসে: `crew` (কাজ ধরে ধরে) আর `crewTotal`। **লোক যোগ হয়, দিন হয় না** — একসাথে কাজ করলে সবচেয়ে লম্বা কাজটাই সময় ঠিক করে।

> পরে যদি দাম হিসাব করাতে চান (`লোক × দিন × হাজিরা`), তখন `estimateCalc.ts`-এর `crewOf` থেকে শুরু করলেই হবে। এখনকার মজুরির অঙ্কগুলো নতুন করে বসাতে হবে বলেই এখন করিনি।


---

## ৮. যাচাই করতে গিয়ে দুটো আসল bug ধরা পড়েছে

Prisma-র engine এই পরিবেশে নামানো যায় না, তাই আসল client বানিয়ে type check করা যায়নি। বদলে দুটো কাজ করেছি, আর **দুটোতেই একটা করে সত্যিকারের ভুল বেরিয়েছে**:

**১. `replayCost` import হয়নি।** একটা stub `@prisma/client` বানিয়ে বাকি সব type check করেছি। ধরা পড়ল `stockService.ts`-এ `replayCost` ব্যবহার হচ্ছে কিন্তু import করা নেই — **server চালু হওয়ার সময়ই ভাঙত।** ঠিক করা হয়েছে।

**২. `sellLocked` schema-তে বসেনি।** schema.prisma আর migration SQL মিলিয়ে দেখার একটা script লিখেছি। ধরা পড়ল column-টা SQL-এ আছে কিন্তু schema-তে নেই — **Prisma client ঐ field চিনত না, হাতে বসানো দামের পুরো কাজটাই কাজ করত না।** ঠিক করা হয়েছে।

এখন schema আর migration নিখুঁত মিলছে: প্রতিটা enum, প্রতিটা column, দুই দিকেই।


---
---

# আগের ডেলিভারি

# SAS DOOR — Backend পরিবর্তন

**ধাপ ১ — Supplier advance (আগাম টাকা)**
তারিখ: ১৮ সেপ্টেম্বর ২০২৬

---

## ⚠️ প্রথমে এই দুটো কাজ করুন

### ১. Migration চালান

নতুন একটা column যোগ হয়েছে, তাই ডেটাবেস আপডেট করতে হবে:

```
cd F:\sasdoor-backend
npx prisma migrate dev
npx prisma generate
```

> **এটা না চালালে server চালু হবে না।** কারণ কোডে `payment.type` ব্যবহার করা হয়েছে,
> কিন্তু পুরনো Prisma client-টা ওই field-এর কথা জানে না।
> `prisma generate` চালালেই ঠিক হয়ে যাবে।

পুরনো সব payment নিজে থেকেই `PAYMENT` হিসেবে থাকবে — কোনো ডেটা নষ্ট হবে না।

### ২. `.env`-এর তিনটে জিনিস বদলান

`.env` file-টা আগের zip-এ চলে গিয়েছিল, তাই এগুলো আর গোপন নেই:

- `JWT_SECRET` — **সবচেয়ে জরুরি**, এটা দিয়ে যে কেউ admin token বানাতে পারে
- `SUPER_ADMIN_PASSWORD`
- ডেটাবেসের password

নতুন `JWT_SECRET` বানানোর সহজ উপায় — PowerShell-এ:

```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

বদলানোর পর সবাইকে আবার login করতে হবে, এটা স্বাভাবিক।

---

## কী বদলেছে

### নতুন: আগাম টাকা দেওয়া যাবে

আগে সাপ্লায়ারকে বাকির চেয়ে বেশি টাকা দেওয়া যেত না। এখন যেকোনো সময়, যেকোনো
পরিমাণ দেওয়া যাবে — কোনো চালান না থাকলেও।

**নিয়মটা সহজ — একটাই চলতি খাতা:**

| খাতার অঙ্ক | মানে |
| --- | --- |
| পজিটিভ | আপনি সাপ্লায়ারকে দেবেন → **বাকি** |
| নেগেটিভ | সাপ্লায়ার আপনাকে কাঠ দেবে → **আগাম** |

পরের চালান এলে আগাম টাকা নিজে থেকেই কাটা পড়বে। আলাদা করে "এই চালানে আগাম
থেকে কাটো" বলতে হবে না।

### ফাইল ধরে ধরে

| ফাইল | কী বদলেছে |
| --- | --- |
| `prisma/schema.prisma` | নতুন enum `SupplierPaymentType` (PAYMENT / ADVANCE), আর `SupplierPayment.type` field |
| `prisma/migrations/20260918120000_supplier_advance/` | নতুন migration |
| `src/routes/suppliers.routes.ts` | `balances()` এখন `payable` আর `advance` আলাদা করে দেয়; payment API `type` নেয়; ledger-এ `advance` যোগ |

### API-তে কী নতুন

**`GET /api/admin/suppliers`** — প্রতিটা সাপ্লায়ারে তিনটে নতুন সংখ্যা:

```json
{
  "due":      -50000,   // signed — নেগেটিভ মানে আগাম
  "payable":  0,        // কখনো নেগেটিভ হবে না
  "advance":  50000     // কখনো নেগেটিভ হবে না
}
```

**`GET /api/admin/suppliers/:id/ledger`** — সাথে `payable` আর `advance`।

**`POST /api/admin/suppliers/:id/payments`** — এখন `type` নেয়:

```json
{ "amount": 200000, "type": "ADVANCE", "method": "BANK", "note": "অগ্রিম" }
```

`type` না পাঠালে `PAYMENT` ধরা হবে, তাই পুরনো কোড ভাঙবে না।

---

## কেন `payable` আর `advance` আলাদা

এক সাপ্লায়ারকে ২ লাখ আগাম, আরেকজনের ২ লাখ বাকি — শুধু `due` যোগ করলে শূন্য আসে,
মনে হয় হিসাব চুকে গেছে। অথচ দুজনের কারো হিসাবই মেলেনি।

তাই **দুটো সংখ্যা সবসময় আলাদা থাকবে, কখনো যোগ হবে না।**

---

## যা ইচ্ছে করেই বদলাইনি

চালান তোলার সময় total-এর চেয়ে বেশি টাকা এখনো দেওয়া যায় না। বাড়তি টাকা
আলাদা advance হিসেবেই বসা উচিত — চালানের লাইনে না। এটা আগের মতোই আছে।
