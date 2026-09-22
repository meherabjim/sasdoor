import { Prisma, PrismaClient } from "@prisma/client";

// one shared client for the whole app
export const prisma = new PrismaClient();
export type Tx = Prisma.TransactionClient;

/**
 * Is the generated client as new as the schema?
 *
 * `@prisma/client` is not the schema - it is code generated from it, and it lives in
 * node_modules. Update the project without regenerating and you get a client that has
 * never heard of the newest columns, while the database has them. Prisma then refuses
 * every write that mentions one, with three hundred lines of "Unknown argument" and no
 * hint of what actually went wrong: the screen just says "Server error".
 *
 * `npm run dev` regenerates first, so this should not happen. It is checked anyway,
 * because the failure is invisible at the point it is caused and unmistakable here.
 */
const NEEDED = ["customDesignSvg", "customDesignName", "needsQuote", "quotedAt"] as const;

export function assertClientMatchesSchema() {
  const known = Object.keys((Prisma as unknown as { EstimateScalarFieldEnum?: object }).EstimateScalarFieldEnum ?? {});
  if (!known.length) return;                       // nothing to compare against; let it run
  const missing = NEEDED.filter((f) => !known.includes(f));
  if (!missing.length) return;
  console.error(
    `\n  The Prisma client in node_modules is older than the schema.` +
    `\n  It does not know: ${missing.join(", ")}` +
    `\n\n  Fix it with one command, in the backend folder:` +
    `\n\n      npx prisma generate\n\n  then start the server again.\n`,
  );
  process.exit(1);
}
