import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createWebHandler } from "../src/web.js";

let root: string;
let server: Server;
let baseUrl: string;

async function listen(handler: ReturnType<typeof createWebHandler>) {
  const nextServer = createServer((request, response) => {
    void handler(request, response);
  });

  await new Promise<void>((resolve, reject) => {
    nextServer.once("error", reject);
    nextServer.listen(0, "127.0.0.1", resolve);
  });

  const address = nextServer.address() as AddressInfo;

  return { server: nextServer, baseUrl: `http://127.0.0.1:${address.port}` };
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "calendar-web-"));
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "index.html"), "<!doctype html><title>Calendar</title>");
  await writeFile(join(root, "assets", "app-123.js"), "console.log('app')");
  await writeFile(join(root, "favicon.svg"), "<svg></svg>");

  ({ server, baseUrl } = await listen(createWebHandler(root)));
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
  await rm(root, { recursive: true, force: true });
});

describe("createWebHandler", () => {
  it("serves index.html at the root without caching", async () => {
    const response = await fetch(`${baseUrl}/`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(response.headers.get("cache-control")).toBe("no-cache");
    expect(await response.text()).toContain("Calendar");
  });

  it.each(["/owner", "/owner/meeting-types", "/book/00000000-0000-4000-8000-000000000001"])(
    "falls back to index.html for the client route %s",
    async (path) => {
      const response = await fetch(`${baseUrl}${path}`);

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    },
  );

  it("serves hashed assets with an immutable cache policy", async () => {
    const response = await fetch(`${baseUrl}/assets/app-123.js`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(await response.text()).toBe("console.log('app')");
  });

  it("serves other static files", async () => {
    const response = await fetch(`${baseUrl}/favicon.svg`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/svg+xml");
  });

  it("returns 404 for a missing asset instead of the SPA shell", async () => {
    const response = await fetch(`${baseUrl}/assets/missing.js`);

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Not Found");
  });

  it("returns 404 for a path traversal attempt", async () => {
    const response = await fetch(`${baseUrl}/%2e%2e%2fpackage.json`);

    expect(response.status).toBe(404);
  });

  it("supports HEAD without a body", async () => {
    const response = await fetch(`${baseUrl}/`, { method: "HEAD" });

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(Number(response.headers.get("content-length"))).toBeGreaterThan(0);
    expect(await response.text()).toBe("");
  });

  it("rejects unsupported methods", async () => {
    const response = await fetch(`${baseUrl}/`, { method: "POST" });

    expect(response.status).toBe(405);
  });
});
