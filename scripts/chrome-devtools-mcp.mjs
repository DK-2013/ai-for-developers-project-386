import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// chrome-devtools-mcp officially supports Google Chrome and Chrome for Testing
// only. Playwright already ships Chrome for Testing in a versioned cache
// directory, so resolve the newest one instead of hard-coding a path that breaks
// after the next Playwright update. The MCP version is pinned like @playwright/mcp
// in opencode.json.
const mcpVersion = "1.12.0";

function cachedChromiumPaths() {
  const browsersPath =
    process.env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), ".cache", "ms-playwright");

  let entries;
  try {
    entries = readdirSync(browsersPath, { withFileTypes: true });
  } catch {
    return [];
  }

  return entries
    .filter((entry) => entry.isDirectory() && /^chromium-\d+$/.test(entry.name))
    .toSorted((a, b) => Number(b.name.split("-")[1]) - Number(a.name.split("-")[1]))
    .flatMap((entry) => [
      join(browsersPath, entry.name, "chrome-linux64", "chrome"),
      join(browsersPath, entry.name, "chrome-linux", "chrome"),
      join(browsersPath, entry.name, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
    ]);
}

const executablePath =
  process.env.CHROME_DEVTOOLS_MCP_CHROME ?? cachedChromiumPaths().find(existsSync);

if (!executablePath || !existsSync(executablePath)) {
  console.error(
    [
      "Chrome for Testing not found.",
      "Run `pnpm dlx playwright install chromium`, or set CHROME_DEVTOOLS_MCP_CHROME",
      "to a Google Chrome or Chrome for Testing executable.",
    ].join("\n"),
  );
  process.exit(1);
}

const child = spawn(
  "pnpm",
  [
    "dlx",
    `chrome-devtools-mcp@${mcpVersion}`,
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
