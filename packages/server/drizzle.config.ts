import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import { fileURLToPath } from "node:url";

config({
  path: fileURLToPath(new URL("../../.env", import.meta.url)),
  override: true,
  quiet: true,
});

// `generate` reads only the schema and writes SQL; it never opens a connection,
// so credentials are not configured until migrations are applied at runtime.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
