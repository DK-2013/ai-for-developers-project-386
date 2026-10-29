import type { IncomingMessage, ServerResponse } from "node:http";

export function requestHandler(
  request: IncomingMessage,
  response: ServerResponse,
): void {
  if (request.method === "GET" && request.url === "/healthz") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ status: "ok" }));
    return;
  }

  response.writeHead(404, { "content-type": "application/json" });
  response.end(JSON.stringify({ error: "Not Found" }));
}
