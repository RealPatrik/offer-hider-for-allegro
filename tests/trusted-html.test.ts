import { afterEach, describe, expect, it, vi } from "vitest";

// The module caches its Trusted Types policy lookup at first use, so each
// test needs its own fresh module instance rather than sharing the cache.
async function freshSetInnerHtml() {
  vi.resetModules();
  const mod = await import("../src/content/trusted-html");
  return mod.setInnerHtml;
}

describe("setInnerHtml", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("assigns innerHTML directly when the page has no Trusted Types policy factory", async () => {
    const setInnerHtml = await freshSetInnerHtml();
    const el = document.createElement("div");
    setInnerHtml(el, "<span>hello</span>");
    expect(el.innerHTML).toBe("<span>hello</span>");
  });

  it("routes through a Trusted Types policy when the page enforces one", async () => {
    const createHTML = vi.fn((s: string) => s);
    const createPolicy = vi.fn(() => ({ createHTML }));
    vi.stubGlobal("trustedTypes", { createPolicy });

    const setInnerHtml = await freshSetInnerHtml();
    const el = document.createElement("div");
    setInnerHtml(el, "<span>hello</span>");

    expect(createPolicy).toHaveBeenCalledWith("offer-hider-for-allegro", expect.any(Object));
    expect(createHTML).toHaveBeenCalledWith("<span>hello</span>");
    expect(el.innerHTML).toBe("<span>hello</span>");
  });
});
