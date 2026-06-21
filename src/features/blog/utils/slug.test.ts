import { describe, it, expect } from "vitest";
import { sanitizeSlug } from "./slug";

describe("sanitizeSlug", () => {
  it("accepts and lowercases a well-formed slug", () => {
    expect(sanitizeSlug("Cross-Chain-Collaboration")).toBe(
      "cross-chain-collaboration",
    );
    expect(sanitizeSlug("  future-of-dev  ")).toBe("future-of-dev");
    expect(sanitizeSlug("post123")).toBe("post123");
  });

  it("returns null for empty or missing input", () => {
    expect(sanitizeSlug(undefined)).toBeNull();
    expect(sanitizeSlug("")).toBeNull();
    expect(sanitizeSlug("   ")).toBeNull();
  });

  it.each([
    "../etc/passwd",
    "a/b",
    "<script>",
    "has space",
    "-leading",
    "trailing-",
    "double--hyphen",
    "under_score",
    "emoji-🚀",
  ])("rejects the unsafe slug %j", (input) => {
    expect(sanitizeSlug(input)).toBeNull();
  });
});
