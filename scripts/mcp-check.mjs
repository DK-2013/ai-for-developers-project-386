import { fileURLToPath } from "node:url";

import { initializeMcpServer } from "./mcp-handshake.mjs";
import { installedChromium } from "./playwright-chromium.mjs";

const chromeDevtoolsWrapper = fileURLToPath(new URL("./chrome-devtools-mcp.mjs", import.meta.url));

const [playwright, chromeDevtools, chromium] = await Promise.allSettled([
  initializeMcpServer({
    name: "Playwright MCP",
    command: "playwright-mcp",
    args: ["--browser", "chromium"],
  }),
  initializeMcpServer({
    name: "Chrome DevTools MCP",
    command: process.execPath,
    args: [chromeDevtoolsWrapper],
  }),
  installedChromium(),
]);

let healthy = true;

function reportServer(label, result) {
  if (result.status === "fulfilled") {
    const { protocolVersion, tools } = result.value;
    console.log(`${label}: connected (${tools} tools, MCP ${protocolVersion})`);
    return;
  }

  healthy = false;
  console.error(`${label}: FAILED`);
  console.error(result.reason?.message ?? String(result.reason));
}

reportServer("Playwright MCP", playwright);
reportServer("Chrome DevTools MCP", chromeDevtools);

if (chromium.status === "fulfilled") {
  const { executablePath, installPath } = chromium.value;
  if (executablePath) {
    console.log(`Chromium: installed at ${executablePath}`);
  } else {
    healthy = false;
    console.error(`Chromium: not installed in ${installPath}`);
    console.error("Run `mise run mcp:browsers` to install it.");
  }
} else {
  healthy = false;
  console.error("Chromium: FAILED to locate the Playwright browser");
  console.error(chromium.reason?.message ?? String(chromium.reason));
}

if (!healthy) {
  process.exitCode = 1;
}
