import { describe, expect, it } from "vitest";
import { apiClientOptions, resolveApiEndpoint } from "../api/queries";

describe("api client options", () => {
  it("builds an absolute endpoint on the page origin", () => {
    expect(resolveApiEndpoint("http://localhost:5173")).toBe("http://localhost:5173/api");
  });

  it("falls back to the local development origin outside the browser", () => {
    expect(resolveApiEndpoint(undefined)).toBe("http://localhost:3000/api");
  });

  it("allows plain HTTP for local development", () => {
    expect(apiClientOptions("http://localhost:5173")).toEqual({
      endpoint: "http://localhost:5173/api",
      allowInsecureConnection: true,
    });
  });

  it("keeps the secure default for HTTPS", () => {
    expect(apiClientOptions("https://calendar.example")).toEqual({
      endpoint: "https://calendar.example/api",
      allowInsecureConnection: false,
    });
  });
});
