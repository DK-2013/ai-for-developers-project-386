import { existsSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// chrome-devtools-mcp officially supports Google Chrome and Chrome for Testing
// only. Playwright already ships Chrome for Testing in a versioned cache
// directory, so resolve the newest one instead of hard-coding a path that breaks
// after the next Playwright update.
function chromeForTestingCandidates(browsersPath) {
  let entries;
  try {
    entries = readdirSync(browsersPath, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return [];
    }
    throw new Error(`Read Playwright browser cache: ${browsersPath}`, { cause: error });
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

export function findChromeForTesting(env = process.env) {
  const override = env.CHROME_DEVTOOLS_MCP_CHROME;
  if (override) {
    return override;
  }

  const browsersPath = env.PLAYWRIGHT_BROWSERS_PATH ?? join(homedir(), ".cache", "ms-playwright");
  return chromeForTestingCandidates(browsersPath).find(existsSync);
}
