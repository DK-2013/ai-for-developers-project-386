import { defineConfig } from "drizzle-kit";
import { loadDotEnv } from "./src/config.js";

loadDotEnv();

// `generate` reads only the schema and writes SQL; it never opens a connection,
// so credentials are not configured until migrations are applied at runtime.
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
});
