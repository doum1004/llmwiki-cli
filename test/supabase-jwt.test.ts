import { describe, it, expect } from "bun:test";
import { parseJwtSub } from "../src/lib/supabase-jwt.ts";

describe("parseJwtSub", () => {
  it("reads sub from a JWT-shaped token", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "user-uuid-123" })).toString("base64url");
    const token = `e30.${payload}.sig`;
    expect(parseJwtSub(token)).toBe("user-uuid-123");
  });

  it("returns undefined for malformed input", () => {
    expect(parseJwtSub("")).toBeUndefined();
    expect(parseJwtSub("a.b")).toBeUndefined();
  });
});
