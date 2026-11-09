import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import type { IncomingMessage, ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";

const MIME_TYPES: Readonly<Record<string, string>> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff2": "font/woff2",
};

const IMMUTABLE_CACHE = "public, max-age=31536000, immutable";
const SHORT_CACHE = "public, max-age=3600";
const NO_CACHE = "no-cache";

export type WebHandler = (request: IncomingMessage, response: ServerResponse) => Promise<void>;

type StaticFile = {
  path: string;
  size: number;
};

function parsePathname(rawUrl: string | undefined): string | undefined {
  let pathname: string;

  try {
    pathname = new URL(rawUrl ?? "/", "http://localhost").pathname;
  } catch {
    return undefined;
  }

  try {
    return decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
}

/**
 * Resolves a URL pathname inside `root`, or returns `undefined` when the path
 * would escape it (path traversal, NUL bytes, malformed escapes).
 */
function resolveStaticPath(root: string, pathname: string): string | undefined {
  if (pathname.includes("\0")) {
    return undefined;
  }

  const filePath = resolve(root, `.${pathname}`);

  if (filePath !== root && !filePath.startsWith(`${root}${sep}`)) {
    return undefined;
  }

  return filePath;
}

async function findFile(path: string): Promise<StaticFile | undefined> {
  try {
    const info = await stat(path);

    return info.isFile() ? { path, size: info.size } : undefined;
  } catch {
    return undefined;
  }
}

function cacheControl(pathname: string): string {
  if (pathname === "/index.html") {
    return NO_CACHE;
  }

  if (pathname.startsWith("/assets/")) {
    return IMMUTABLE_CACHE;
  }

  return SHORT_CACHE;
}

function contentType(path: string): string {
  return MIME_TYPES[extname(path).toLowerCase()] ?? "application/octet-stream";
}

function sendText(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(message);
}

function sendFile(
  request: IncomingMessage,
  response: ServerResponse,
  file: StaticFile,
  pathname: string,
): void {
  const headers = {
    "content-type": contentType(file.path),
    "content-length": String(file.size),
    "cache-control": cacheControl(pathname),
  };

  if (request.method === "HEAD") {
    response.writeHead(200, headers);
    response.end();
    return;
  }

  response.writeHead(200, headers);
  createReadStream(file.path)
    .on("error", () => {
      response.destroy();
    })
    .pipe(response);
}

/**
 * Serves the built web app from `root`. Unknown paths fall back to
 * `index.html` so client-side routes survive a page reload; missing assets and
 * paths with a file extension return 404 instead of the SPA shell.
 */
export function createWebHandler(root: string): WebHandler {
  const rootPath = resolve(root);

  return async (request, response) => {
    if (request.method !== "GET" && request.method !== "HEAD") {
      sendText(response, 405, "Method Not Allowed");
      return;
    }

    const pathname = parsePathname(request.url);

    if (pathname === undefined) {
      sendText(response, 400, "Bad Request");
      return;
    }

    const filePath = resolveStaticPath(rootPath, pathname);

    if (filePath === undefined) {
      sendText(response, 404, "Not Found");
      return;
    }

    const file = await findFile(filePath);

    if (file !== undefined) {
      sendFile(request, response, file, pathname);
      return;
    }

    const isAsset = pathname.startsWith("/assets/") || extname(pathname) !== "";

    if (isAsset) {
      sendText(response, 404, "Not Found");
      return;
    }

    const index = await findFile(resolve(rootPath, "index.html"));

    if (index === undefined) {
      sendText(response, 404, "Not Found");
      return;
    }

    sendFile(request, response, index, "/index.html");
  };
}
