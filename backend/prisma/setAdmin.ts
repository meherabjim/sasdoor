/**
 * Create or reset the Super Admin from .env.
 *
 * `prisma db seed` deliberately leaves an existing account alone (`if (!exists)`), so
 * changing SUPER_ADMIN_PASSWORD in .env and re-seeding does nothing - which is exactly
 * what you do not want when a password has leaked and you need it changed now.
 *
 *   npm run set-admin
 *
 * Creates the account when it is missing, and resets the name, phone, role and password
 * when it already exists. Nothing else in the database is touched.
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SUPER_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SUPER_ADMIN_PASSWORD ?? "";
  const name = (process.env.SUPER_ADMIN_NAME ?? "Super Admin").trim();
  const phone = (process.env.SUPER_ADMIN_PHONE ?? "").trim() || null;

  if (!email || !password) {
    console.error("\n  SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD must both be set in .env\n");
    process.exit(1);
  }
  if (password.length < 10) {
    console.error("\n  Use a password of at least 10 characters.\n");
    process.exit(1);
  }
  if (/change|example|admin123|password/i.test(password)) {
    console.error("\n  That is still a placeholder password. Put a real one in .env first.\n");
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const existing = await prisma.user.findUnique({ where: { email } });

  const user = existing
    ? await prisma.user.update({ where: { email }, data: { name, passwordHash, role: "SUPER_ADMIN", ...(phone ? { phone } : {}) } })
    : await prisma.user.create({ data: { name, email, passwordHash, role: "SUPER_ADMIN", ...(phone ? { phone } : {}) } });

  console.log(`\n  ${existing ? "Password reset for" : "Super Admin created:"} ${user.email}`);
  console.log("  Log in at http://localhost:3000/login\n");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
