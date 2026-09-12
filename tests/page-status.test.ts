import { describe, expect, it } from "vitest";
import { isPageHideStatus, isPageStatusMessage } from "../src/core/page-status";

describe("page status messaging", () => {
  it("accepts only the two known popup commands", () => {
    expect(isPageStatusMessage({ type: "aoh:get-page-status" })).toBe(true);
    expect(isPageStatusMessage({ type: "aoh:set-temporary-reveal", enabled: true })).toBe(true);
    expect(isPageStatusMessage({ type: "aoh:set-temporary-reveal" })).toBe(false);
    expect(isPageStatusMessage({ type: "other" })).toBe(false);
  });

  it("accepts only complete, non-negative page status responses", () => {
    expect(
      isPageHideStatus({ matchedCount: 2, temporarilyRevealed: false, hidingEnabled: true }),
    ).toBe(true);
    expect(isPageHideStatus({ matchedCount: -1, temporarilyRevealed: false, hidingEnabled: true })).toBe(false);
    expect(isPageHideStatus({ matchedCount: 1, temporarilyRevealed: "yes", hidingEnabled: true })).toBe(false);
  });
});
