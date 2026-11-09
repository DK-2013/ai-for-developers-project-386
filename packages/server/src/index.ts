import { existsSync } from "node:fs";
import { createServer } from "node:http";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { createRequestHandler } from "./app.js";
import { systemClock } from "./clock.js";
import { loadConfig } from "./config.js";
import { prepareDatabase } from "./db/prepare-database.js";
import { schema } from "./db/schema.js";
import { createHttpHandler } from "./http.js";
import { createWebHandler } from "./web.js";

async function main(): Promise<void> {
  const config = loadConfig();
  const pool = new Pool({ connectionString: config.databaseUrl });
  const db = drizzle(pool, { schema });

  await prepareDatabase(db, { migrateOnStart: config.migrateOnStart });

  if (config.webDist !== undefined && !existsSync(config.webDist)) {
    throw new Error(`WEB_DIST points to a missing directory: ${config.webDist}`);
  }

  const server = createServer(
    createHttpHandler({
      api: createRequestHandler({
        db,
        owner: config.owner,
        clock: systemClock,
      }),
      web: config.webDist === undefined ? undefined : createWebHandler(config.webDist),
    }),
  );

  server.listen(config.port, () => {
    process.stdout.write(`Server listening on http://localhost:${config.port}\n`);
  });
}

main().catch((error: unknown) => {
  console.error("Server failed to start", error);
  process.exitCode = 1;
});
