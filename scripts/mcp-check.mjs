import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { initializeMcpServer } from "./mcp-handshake.mjs";

const chromeDevtoolsWrapper = fileURLToPath(new URL("./chrome-devtools-mcp.mjs", import.meta.url));
const outputDir = mkdtempSync(join(tmpdir(), "mcp-check-"));

let results;
try {
  results = await Promise.allSettled([
    initializeMcpServer({
      name: "Playwright MCP",
      command: "playwright-mcp",
      args: ["--browser", "chromium", "--headless", "--isolated", "--output-dir", outputDir],
      tool: { name: "browser_navigate", arguments: { url: "about:blank" } },
    }),
    initializeMcpServer({
      name: "Chrome DevTools MCP",
      command: process.execPath,
      args: [chromeDevtoolsWrapper],
      tool: { name: "list_pages", arguments: {} },
    }),
  ]);
} finally {
  rmSync(outputDir, { recursive: true, force: true });
}

let healthy = true;

function reportServer(label, result) {
  if (result.status === "fulfilled") {
    const { tool, tools } = result.value;
    console.log(`${label}: connected (${tools} tools, browser launched via ${tool})`);
    return;
  }

  healthy = false;
  console.error(`${label}: FAILED`);
  console.error(result.reason?.message ?? String(result.reason));
}

reportServer("Playwright MCP", results[0]);
reportServer("Chrome DevTools MCP", results[1]);

if (!healthy) {
  process.exitCode = 1;
}
