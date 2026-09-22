import app from "./app";
import { env } from "./config/env";
import { assertClientMatchesSchema, prisma } from "./config/prisma";

// Better to refuse to start with one clear line than to start and fail every order.
assertClientMatchesSchema();

const server = app.listen(env.port, () => console.log(`SAS DOOR API: http://localhost:${env.port}`));

const shutdown = async () => { server.close(); await prisma.$disconnect(); process.exit(0); };
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
