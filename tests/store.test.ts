import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeChrome } from "./helpers/fake-chrome";
import type { Store } from "../src/core/store";
import type { HiddenEntry } from "../src/core/types";

async function freshStore(): Promise<Store> {
  vi.resetModules();
  installFakeChrome();
  const mod = await import("../src/core/store");
  await mod.store.ready();
  return mod.store;
}

function entry(key: string, kind: HiddenEntry["kind"] = "offer"): HiddenEntry {
  return { key, kind, name: key, market: "sk", hiddenAt: Date.now() };
}

describe("store", () => {
  let store: Store;

  beforeEach(async () => {
    store = await freshStore();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("starts empty and enabled", () => {
    expect(store.count()).toBe(0);
    expect(store.isEnabled()).toBe(true);
    expect(store.isIncompatible()).toBe(false);
  });

  it("hides and unhides an entry", async () => {
    await store.hide(entry("offer:1"));
    expect(store.isHidden(["offer:1"])).toBe(true);
    expect(store.count()).toBe(1);

    await store.unhide("offer:1");
    expect(store.isHidden(["offer:1"])).toBe(false);
    expect(store.count()).toBe(0);
  });

  it("isHidden matches if any of several keys is hidden", async () => {
    await store.hide(entry("product:abc", "product"));
    expect(store.isHidden(["offer:1", "product:abc"])).toBe(true);
  });

  it("lists entries filtered by name, newest first", async () => {
    await store.hide({ ...entry("offer:1"), name: "Gas mask", hiddenAt: 1000 });
    await store.hide({ ...entry("offer:2"), name: "Paint mask", hiddenAt: 2000 });

    expect(store.list().map((e) => e.key)).toEqual(["offer:2", "offer:1"]);
    expect(store.list("gas").map((e) => e.key)).toEqual(["offer:1"]);
    expect(store.list("nonexistent")).toEqual([]);
  });

  it("persists across a reload of the module (simulating a new tab)", async () => {
    await store.hide(entry("offer:1"));
    // give the debounced write a chance to flush
    await new Promise((resolve) => setTimeout(resolve, 300));

    vi.resetModules();
    const mod = await import("../src/core/store");
    await mod.store.ready();
    expect(mod.store.isHidden(["offer:1"])).toBe(true);
  });

  it("toggles the enabled setting", async () => {
    await store.setSettings({ enabled: false });
    expect(store.isEnabled()).toBe(false);
  });

  it("sets and clears the incompatible flag", async () => {
    await store.setIncompatible(true);
    expect(store.isIncompatible()).toBe(true);
    await store.setIncompatible(false);
    expect(store.isIncompatible()).toBe(false);
  });

  it("notifies onChange listeners on hide/unhide", async () => {
    const listener = vi.fn();
    store.onChange(listener);
    await store.hide(entry("offer:1"));
    expect(listener).toHaveBeenCalledTimes(1);
  });

  describe("export / import", () => {
    it("round-trips hidden entries through export and import", async () => {
      await store.hide(entry("offer:1"));
      const json = store.exportJson();

      const other = await freshStore();
      const result = await other.importJson(json, "merge");
      expect(result).toEqual({ added: 1, skipped: 0 });
      expect(other.isHidden(["offer:1"])).toBe(true);
    });

    it("merge keeps existing entries and skips duplicates", async () => {
      await store.hide(entry("offer:1"));
      await store.hide(entry("offer:2"));
      const json = store.exportJson();

      const other = await freshStore();
      await other.hide(entry("offer:2"));
      const result = await other.importJson(json, "merge");

      expect(result).toEqual({ added: 1, skipped: 1 });
      expect(other.count()).toBe(2);
    });

    it("replace wipes existing entries first", async () => {
      await store.hide(entry("offer:1"));
      const json = store.exportJson();

      const other = await freshStore();
      await other.hide(entry("offer:9"));
      await other.importJson(json, "replace");

      expect(other.count()).toBe(1);
      expect(other.isHidden(["offer:1"])).toBe(true);
      expect(other.isHidden(["offer:9"])).toBe(false);
    });

    it("rejects invalid JSON", async () => {
      await expect(store.importJson("not json", "merge")).rejects.toThrow("invalid-json");
    });

    it("rejects a well-formed but wrong-shaped payload", async () => {
      await expect(store.importJson(JSON.stringify({ foo: "bar" }), "merge")).rejects.toThrow(
        "invalid-schema",
      );
    });
  });
});
