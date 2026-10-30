import type { IncomingMessage, ServerResponse } from "node:http";
import { describe, expect, it } from "vitest";
import { requestHandler } from "../src/app.js";

function createResponse() {
  const chunks: string[] = [];
  const response = {
    statusCode: 0,
    writeHead(statusCode: number) {
      this.statusCode = statusCode;
      return this;
    },
    end(chunk?: string) {
      if (chunk) {
        chunks.push(chunk);
      }
    },
  } as unknown as ServerResponse;

  return { response, body: () => chunks.join("") };
}

describe("requestHandler", () => {
  it("responds to health checks", () => {
    const { response, body } = createResponse();

    requestHandler({ method: "GET", url: "/healthz" } as unknown as IncomingMessage, response);

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(body())).toEqual({ status: "ok" });
  });

  it("returns 404 for unknown routes", () => {
    const { response, body } = createResponse();

    requestHandler({ method: "GET", url: "/unknown" } as unknown as IncomingMessage, response);

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(body())).toEqual({ error: "Not Found" });
  });
});
