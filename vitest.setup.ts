import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Vitest doesn't auto-unmount between tests the way Jest's jsdom
// environment does — without this, it.each-driven tests that render the
// same text across iterations collide (B033 caught this immediately).
afterEach(() => {
  cleanup();
});

// jsdom implements neither of these, and Radix's Select/Dialog primitives
// call them during pointer interaction and scroll-into-view-on-open. This
// is a well-known jsdom gap, not a bug in our components (B035/B039).
if (typeof window !== "undefined") {
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  Element.prototype.hasPointerCapture ??= function hasPointerCapture() {
    return false;
  };
  Element.prototype.setPointerCapture ??= function setPointerCapture() {};
  Element.prototype.releasePointerCapture ??= function releasePointerCapture() {};
}

// jsdom has no object URL implementation at all. FileUploader (B041) relies
// on create/revokeObjectURL for local previews.
if (typeof URL.createObjectURL === "undefined") {
  URL.createObjectURL = () => "blob:mock-url";
}
if (typeof URL.revokeObjectURL === "undefined") {
  URL.revokeObjectURL = () => {};
}
