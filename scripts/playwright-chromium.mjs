import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// `playwright install --dry-run chromium` prints the install location for the
// Playwright version that the `playwright` binary belongs to. Parsing it keeps
// the check tied to the pinned mise tool instead of guessing a browser revision.
function chromiumInstallPath(dryRunOutput) {
  const match = /Install location:\s*(\S*chromium-\d+)\b/.exec(dryRunOutput);
  return match?.[1];
}

function chromiumExecutableCandidates(installPath) {
  return [
    join(installPath, "chrome-linux64", "chrome"),
    join(installPath, "chrome-linux", "chrome"),
    join(installPath, "chrome-mac", "Chromium.app", "Contents", "MacOS", "Chromium"),
  ];
}

export async function installedChromium() {
  const { stdout } = await execFileAsync("playwright", ["install", "--dry-run", "chromium"], {
    env: { ...process.env, NO_COLOR: "1" },
  });
  const installPath = chromiumInstallPath(stdout);
  if (!installPath) {
    throw new Error("playwright install --dry-run chromium did not report an install location");
  }

  const executablePath = chromiumExecutableCandidates(installPath).find((path) => existsSync(path));
  return { installPath, executablePath };
}
