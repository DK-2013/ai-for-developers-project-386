import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

import { findChromeForTesting } from "./chrome-for-testing.mjs";

const executablePath = findChromeForTesting();

if (!executablePath || !existsSync(executablePath)) {
  console.error(
    [
      "Chrome for Testing not found.",
      "Run `mise run mcp:browsers`, or set CHROME_DEVTOOLS_MCP_CHROME",
      "to a Google Chrome or Chrome for Testing executable.",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(
  "chrome-devtools-mcp",
  [
    "--headless",
    "--isolated",
    "--no-usage-statistics",
    "--no-performance-crux",
    `--executable-path=${executablePath}`,
    ...process.argv.slice(2),
  ],
  { stdio: "inherit" },
);

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("error", (error) => {
  console.error(`Failed to start chrome-devtools-mcp: ${error.message}`);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
