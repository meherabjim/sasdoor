import express from "express";
import cors from "cors";
import path from "path";
import { env } from "./config/env";
import { requireAdmin } from "./middleware/auth";
import { errorHandler, notFoundHandler } from "./middleware/error";
import auth from "./routes/auth.routes";
import publicRoutes from "./routes/public.routes";
import settings from "./routes/settings.routes";
import woodTypes from "./routes/woodTypes.routes";
import suppliers from "./routes/suppliers.routes";
import purchases from "./routes/purchases.routes";
import stock from "./routes/stock.routes";
import { colors, designs, labour } from "./routes/prices.routes";
import estimates from "./routes/estimates.routes";
import customers from "./routes/customers.routes";
import { contentAdmin, visitsAdmin } from "./routes/content.routes";
import upload from "./routes/upload.routes";
import users from "./routes/users.routes";
import workers from "./routes/workers.routes";

const app = express();
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: "2mb" }));
// Uploaded files are user content served from this origin. `sandbox` stops an SVG
// opened directly from running anything; `nosniff` stops a .png being read as HTML.
app.use("/uploads", (_req, res, next) => {
  res.setHeader("Content-Security-Policy", "sandbox; default-src 'none'; style-src 'unsafe-inline'");
  res.setHeader("X-Content-Type-Options", "nosniff");
  next();
}, express.static(path.resolve(env.uploadDir)));

app.get("/", (_req, res) => res.json({ success: true, message: "SAS DOOR API is running" }));

app.use("/api/auth", auth);
app.use("/api/public", publicRoutes);

// ---- admin (Super Admin only) ----
const admin = express.Router();
admin.use(requireAdmin);
admin.use("/settings", settings);
admin.use("/wood-types", woodTypes);
admin.use("/suppliers", suppliers);
admin.use("/purchases", purchases);
admin.use("/stock", stock);
admin.use("/colors", colors);
admin.use("/designs", designs);
admin.use("/labour", labour);
admin.use("/estimates", estimates);
admin.use("/customers", customers);
admin.use("/content", contentAdmin);
admin.use("/visits", visitsAdmin);
admin.use("/upload", upload);
admin.use("/users", users);
admin.use("/workers", workers);
app.use("/api/admin", admin);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
