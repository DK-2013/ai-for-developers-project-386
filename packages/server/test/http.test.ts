import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHttpHandler, type HttpHandler } from "../src/http.js";
import { createWebHandler } from "../src/web.js";

let root: string;
let withWeb: Server;
let apiOnly: Server;
let withWebUrl: string;
let apiOnlyUrl: string;

const api: HttpHandler = (request, response) => {
  response.writeHead(200, { "content-type": "application/json" });
  response.end(JSON.stringify({ url: request.url }));
};

async function listen(handler: HttpHandler) {
  const server = createServer(handler);

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address() as AddressInfo;

  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

async function close(server: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
}

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "calendar-http-"));
  await mkdir(join(root, "assets"));
  await writeFile(join(root, "index.html"), "<!doctype html><title>Calendar</title>");
  await writeFile(join(root, "assets", "app-123.js"), "console.log('app')");

  const web = createWebHandler(root);

  ({ server: withWeb, baseUrl: withWebUrl } = await listen(createHttpHandler({ api, web })));
  ({ server: apiOnly, baseUrl: apiOnlyUrl } = await listen(
    createHttpHandler({ api, web: undefined }),
  ));
});

afterAll(async () => {
  await Promise.all([close(withWeb), close(apiOnly)]);
  await rm(root, { recursive: true, force: true });
});

describe("createHttpHandler with a web build", () => {
  it("strips the /api prefix and keeps the query string", async () => {
    const response = await fetch(`${withWebUrl}/api/meeting-types?limit=5`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ url: "/meeting-types?limit=5" });
  });

  it("maps /api to the API root", async () => {
    const response = await fetch(`${withWebUrl}/api`);

    expect(await response.json()).toEqual({ url: "/" });
  });

  it("maps /api/healthz to the contract health path", async () => {
    const response = await fetch(`${withWebUrl}/api/healthz`);

    expect(await response.json()).toEqual({ url: "/healthz" });
  });

  it("serves /healthz from the API", async () => {
    const response = await fetch(`${withWebUrl}/healthz`);

    expect(await response.json()).toEqual({ url: "/healthz" });
  });

  it("serves the SPA for client routes", async () => {
    const response = await fetch(`${withWebUrl}/owner`);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
    expect(await response.text()).toContain("Calendar");
  });

  it("does not fall back to the SPA for missing assets", async () => {
    const response = await fetch(`${withWebUrl}/assets/missing.js`);

    expect(response.status).toBe(404);
  });
});

describe("createHttpHandler without a web build", () => {
  it("keeps serving contract paths at the root", async () => {
    const response = await fetch(`${apiOnlyUrl}/meeting-types`);

    expect(await response.json()).toEqual({ url: "/meeting-types" });
  });

  it("keeps /healthz at the root", async () => {
    const response = await fetch(`${apiOnlyUrl}/healthz`);

    expect(await response.json()).toEqual({ url: "/healthz" });
  });
});
