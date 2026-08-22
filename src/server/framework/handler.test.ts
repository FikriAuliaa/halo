import { describe, expect, it } from "vitest";
import { parseQueryParams } from "./handler";

/**
 * Real, live bug: `Object.fromEntries(searchParams)` silently keeps
 * only the *last* value for a repeated query key, which broke
 * `GET /api/numbers?exclude=a&exclude=b` (the "Refresh" button, once
 * enough numbers were shown to need excluding more than one) with a
 * generic 422 — found by a user clicking it in a real browser, not by
 * any of this project's own extensive test suite, since every existing
 * test reached this endpoint via `suffix`, never `exclude`.
 */
describe("parseQueryParams", () => {
  it("groups a repeated key into an array", () => {
    const url = new URL("http://localhost/api/numbers?exclude=a&exclude=b&exclude=c");
    expect(parseQueryParams(url)).toEqual({ exclude: ["a", "b", "c"] });
  });

  it("keeps a single-occurrence key as a plain string, not a one-element array", () => {
    const url = new URL("http://localhost/api/numbers?status=pending");
    expect(parseQueryParams(url)).toEqual({ status: "pending" });
  });

  it("handles a mix of scalar and repeated keys in the same query string", () => {
    const url = new URL("http://localhost/api/numbers?limit=12&exclude=a&exclude=b");
    expect(parseQueryParams(url)).toEqual({ limit: "12", exclude: ["a", "b"] });
  });

  it("returns an empty object for no query params", () => {
    expect(parseQueryParams(new URL("http://localhost/api/numbers"))).toEqual({});
  });
});
