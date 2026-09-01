import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { installFakeChrome } from "./helpers/fake-chrome";

function fixture(name: string): string {
  return readFileSync(join(process.cwd(), "tests/fixtures", name), "utf8");
}

async function setup() {
  vi.resetModules();
  installFakeChrome();

  document.body.innerHTML = `
    <div data-box-name="product listing items">
      ${fixture("sk-listing-card-normal.html")}
      ${fixture("sk-listing-card-sponsored.html")}
    </div>
  `;

  const { store } = await import("../src/core/store");
  const { startScanning } = await import("../src/content/scanner");
  await store.ready();
  return { store, startScanning };
}

async function flushRaf(): Promise<void> {
  await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)));
}

describe("scanner", () => {
  // Each test starts its own scanner instance, which registers a MutationObserver
  // on document.documentElement (module-scoped, so it outlives the test's own
  // teardown). Without disconnecting them, observers from earlier tests keep
  // reacting to later tests' DOM changes and race to claim `data-aoh-seen`
  // before the current test's own scanner does. Track and disconnect them here.
  const observers: MutationObserver[] = [];

  beforeEach(() => {
    document.body.innerHTML = "";
    const RealMutationObserver = MutationObserver;
    vi.stubGlobal(
      "MutationObserver",
      class extends RealMutationObserver {
        constructor(callback: MutationCallback) {
          super(callback);
          observers.push(this);
        }
      },
    );
  });

  afterEach(() => {
    observers.forEach((observer) => observer.disconnect());
    observers.length = 0;
    vi.unstubAllGlobals();
  });

  it("mounts hide controls on every recognisable card and leaves them visible by default", async () => {
    const { startScanning } = await setup();
    startScanning();

    const articles = document.querySelectorAll("article");
    expect(articles.length).toBe(2);
    articles.forEach((article) => {
      expect(article.hasAttribute("data-aoh-seen")).toBe(true);
      expect(article.hasAttribute("data-aoh")).toBe(false);
      expect(article.lastElementChild?.shadowRoot).toBeTruthy();
    });
  });

  it("hides a card whose offer is already in the store before scanning starts", async () => {
    const { store, startScanning } = await setup();
    await store.hide({
      key: "offer:18854735928",
      kind: "offer",
      name: "test",
      market: "sk",
      hiddenAt: Date.now(),
    });

    startScanning();

    const articles = [...document.querySelectorAll("article")];
    expect(articles[0]?.getAttribute("data-aoh")).toBe("hidden");
    expect(articles[1]?.getAttribute("data-aoh")).toBeNull();
  });

  it("re-applies visibility live when the store changes after scanning", async () => {
    const { store, startScanning } = await setup();
    startScanning();

    const articles = [...document.querySelectorAll("article")];
    expect(articles[0]?.getAttribute("data-aoh")).toBeNull();

    await store.hide({
      key: "offer:18854735928",
      kind: "offer",
      name: "test",
      market: "sk",
      hiddenAt: Date.now(),
    });
    expect(articles[0]?.getAttribute("data-aoh")).toBe("hidden");

    await store.unhide("offer:18854735928");
    expect(articles[0]?.getAttribute("data-aoh")).toBeNull();
  });

  it("picks up cards added to the DOM after the initial scan", async () => {
    const { startScanning } = await setup();
    startScanning();

    const container = document.querySelector('[data-box-name="product listing items"]')!;
    container.insertAdjacentHTML("beforeend", fixture("pl-listing-card-normal.html"));
    await flushRaf();

    const articles = document.querySelectorAll("article");
    expect(articles.length).toBe(3);
    expect(articles[2]?.hasAttribute("data-aoh-seen")).toBe(true);
  });

  it("does not hide anything while the enabled toggle is off", async () => {
    const { store, startScanning } = await setup();
    await store.hide({
      key: "offer:18854735928",
      kind: "offer",
      name: "test",
      market: "sk",
      hiddenAt: Date.now(),
    });
    await store.setSettings({ enabled: false });

    startScanning();

    const articles = [...document.querySelectorAll("article")];
    expect(articles[0]?.hasAttribute("data-aoh")).toBe(false);
  });

  // Reproduces the real-world failure: on allegro.sk the controls appeared and
  // then vanished within ~1s, because the page hydrates and discards DOM
  // children it did not render itself.
  it("re-mounts controls after the page's own re-render removes them", async () => {
    const { startScanning } = await setup();
    startScanning();

    const article = document.querySelector("article")!;
    expect(article.querySelector("[data-aoh-host]")).not.toBeNull();

    // Simulate hydration wiping our injected node (the card itself survives).
    article.querySelector("[data-aoh-host]")!.remove();
    expect(article.querySelector("[data-aoh-host]")).toBeNull();

    await flushRaf();

    expect(article.querySelector("[data-aoh-host]")).not.toBeNull();
  });

  it("stops re-mounting after a capped number of attempts instead of fighting the page forever", async () => {
    const { startScanning } = await setup();
    startScanning();

    const article = document.querySelector("article")!;

    // Far more removals than the cap allows.
    for (let i = 0; i < 40; i += 1) {
      article.querySelector("[data-aoh-host]")?.remove();
      await flushRaf();
    }

    // Having given up, it must leave the card alone rather than loop forever.
    expect(article.querySelector("[data-aoh-host]")).toBeNull();
  });

  it("publishes diagnostics to a DOM attribute readable from the page's own console", async () => {
    const { startScanning } = await setup();
    startScanning();

    const raw = document.documentElement.getAttribute("data-aoh-debug");
    expect(raw).not.toBeNull();

    const debug = JSON.parse(raw!);
    expect(debug.resolved).toBe(2);
    expect(debug.mounted).toBe(2);
    expect(debug.hostsInDom).toBe(2);
    expect(debug.lastError).toBeNull();
  });
});
