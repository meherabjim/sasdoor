import "dotenv/config";

const required = (key: string, fallback?: string) => {
  const v = process.env[key] ?? fallback;
  if (!v) throw new Error(`.env e ${key} is missing`);
  return v;
};

export const env = {
  port: Number(process.env.PORT ?? 5000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret: required("JWT_SECRET"),
  jwtExpires: process.env.JWT_EXPIRES ?? "7d",
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:3000").split(",").map((s) => s.trim()),
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? "",
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? "",
  superAdminName: process.env.SUPER_ADMIN_NAME ?? "Super Admin",
  uploadDir: process.env.UPLOAD_DIR ?? "uploads",
  publicUrl: process.env.PUBLIC_URL ?? "http://localhost:5000",
};
