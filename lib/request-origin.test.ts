import { describe, expect, it } from "vitest";
import { isSameOrigin } from "./request-origin";

function request(host: string, origin?: string, extra?: Record<string, string>) {
  return {
    headers: new Headers({ host, ...(origin ? { origin } : {}), ...extra }),
    nextUrl: { protocol: "http:" },
  };
}

describe("isSameOrigin", () => {
  it("uses the browser host instead of the 0.0.0.0 bind address", () => {
    expect(isSameOrigin(request("localhost:3000", "http://localhost:3000"))).toBe(true);
    expect(isSameOrigin(request("127.0.0.1:3000", "http://127.0.0.1:3000"))).toBe(true);
  });

  it("rejects another host, another protocol, and malformed origins", () => {
    expect(isSameOrigin(request("localhost:3000", "http://evil.example"))).toBe(false);
    expect(isSameOrigin(request("localhost:3000", "https://localhost:3000"))).toBe(false);
    expect(isSameOrigin(request("localhost:3000", "not-an-origin"))).toBe(false);
  });

  it("rejects cross-site fetch metadata even without an Origin header", () => {
    expect(isSameOrigin(request("localhost:3000", undefined, { "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOrigin(request("localhost:3000"))).toBe(true);
  });

  it("respects the protocol supplied by a trusted reverse proxy", () => {
    expect(isSameOrigin(request("example.com", "https://example.com", { "x-forwarded-proto": "https" }))).toBe(true);
  });
});
