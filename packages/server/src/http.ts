import type { IncomingMessage, ServerResponse } from "node:http";
import type { WebHandler } from "./web.js";

export type HttpHandler = (request: IncomingMessage, response: ServerResponse) => void;

export type HttpHandlerDependencies = {
  api: HttpHandler;
  web: WebHandler | undefined;
};

function sendText(response: ServerResponse, statusCode: number, message: string): void {
  response.writeHead(statusCode, { "content-type": "text/plain; charset=utf-8" });
  response.end(message);
}

function stripApiPrefix(pathname: string): string {
  return pathname.replace(/^\/api(?=\/|$)/, "") || "/";
}

/**
 * Composes the API and the built web app behind one origin.
 *
 * The browser always calls `/api`; the prefix is removed here, so the API keeps
 * the contract paths from `main.tsp`. `/healthz` stays at the root for container
 * and platform health checks. Without a web build (development) every non-API
 * request goes to the API, which is the pre-existing behaviour.
 */
export function createHttpHandler({ api, web }: HttpHandlerDependencies): HttpHandler {
  return (request, response) => {
    let url: URL;

    try {
      url = new URL(request.url ?? "/", "http://localhost");
    } catch {
      sendText(response, 400, "Bad Request");
      return;
    }

    if (url.pathname === "/healthz") {
      api(request, response);
      return;
    }

    if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
      request.url = `${stripApiPrefix(url.pathname)}${url.search}`;
      api(request, response);
      return;
    }

    if (web === undefined) {
      api(request, response);
      return;
    }

    web(request, response).catch((error: unknown) => {
      if (response.headersSent) {
        response.destroy();
        return;
      }

      console.error("Unexpected web handler error", error);
      sendText(response, 500, "Internal Server Error");
    });
  };
}
