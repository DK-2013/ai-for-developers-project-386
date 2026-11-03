import { defineConfig, mergeConfig } from "vitest/config";
import createViteConfig from "./vite.config.ts";

// Vitest 5 does not load `vite.config.ts` on its own, so the Vite plugins and
// the `@calendar/sdk` alias are merged in here explicitly.
const viteConfig = createViteConfig({ command: "serve", mode: "test" });

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: "node",
      include: ["src/test/**/*.test.ts", "src/test/**/*.test.tsx"],
      server: {
        deps: {
          // `@calendar/sdk` is generated source, not an installed package, so
          // Vitest must process it through Vite instead of Node.
          inline: ["@calendar/sdk"],
        },
      },
    },
  }),
);
