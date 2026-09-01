import { hideKeys, identityFromCard } from "../core/identity";
import { store } from "../core/store";
import { HOST_ATTR, mountCardControls } from "./card-ui";
import type { Identity } from "../core/types";

const LISTING_CONTAINER_SELECTOR = '[data-box-name="product listing items"]';

const SEEN_ATTR = "data-aoh-seen";
const DEBUG_ATTR = "data-aoh-debug";

/** After this many cards we've inspected, zero resolved identities means the page layout changed. */
const INCOMPATIBLE_THRESHOLD = 20;

/**
 * Allegro's listing is server-rendered and then hydrated by React, which
 * discards DOM children it doesn't know about — including our injected
 * controls. We re-mount them when that happens, but cap the attempts so a
 * framework that re-renders on every frame can't drag us into an endless
 * mount/remove fight.
 */
const MAX_MOUNT_ATTEMPTS = 25;

interface CardData {
  identity: Identity;
  keys: string[];
}

const cardData = new WeakMap<Element, CardData>();
const mountAttempts = new WeakMap<Element, number>();

let observer: MutationObserver | null = null;
let rafHandle: number | null = null;
let totalCardsSeen = 0;
let resolvedCardsSeen = 0;
let mountedCount = 0;
let remountedCount = 0;
let incompatible = false;
let lastError: { message: string; stack?: string } | null = null;

export const debugState = {
  get totalCardsSeen() {
    return totalCardsSeen;
  },
  get resolvedCardsSeen() {
    return resolvedCardsSeen;
  },
  get mountedCount() {
    return mountedCount;
  },
  get remountedCount() {
    return remountedCount;
  },
  get lastError() {
    return lastError;
  },
};

function recordError(err: unknown): void {
  lastError =
    err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };
}

export function startScanning(): void {
  // Each concern gets its own guard: a failure in one (e.g. MutationObserver
  // being unavailable) must not prevent the others from still working.
  try {
    scan();
  } catch (err) {
    recordError(err);
  }
  try {
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch (err) {
    recordError(err);
  }
  try {
    store.onChange(refreshVisibility);
  } catch (err) {
    recordError(err);
  }
}

function scheduleScan(): void {
  if (rafHandle !== null) return;
  rafHandle = requestAnimationFrame(() => {
    rafHandle = null;
    scan();
  });
}

function scan(): void {
  if (incompatible) return;
  try {
    const container = document.querySelector(LISTING_CONTAINER_SELECTOR) ?? document.documentElement;
    container.querySelectorAll<HTMLElement>("article").forEach(processArticle);
    evaluateCompatibility();
  } catch (err) {
    // Swallow: one bad scan pass should not stop future ones from being scheduled.
    recordError(err);
  }
  publishDebug();
}

function processArticle(article: HTMLElement): void {
  const known = cardData.get(article);
  if (known) {
    // Already resolved on an earlier pass — the only thing left to check is
    // whether our controls survived the page's most recent re-render.
    ensureControls(article, known);
    return;
  }

  // Marked on an earlier pass but never resolved: no identity to be had here.
  if (article.hasAttribute(SEEN_ATTR)) return;

  article.setAttribute(SEEN_ATTR, "");
  totalCardsSeen += 1;

  let identity: Identity | null;
  try {
    identity = identityFromCard(article);
  } catch (err) {
    recordError(err);
    return;
  }
  if (!identity) return;

  const keys = hideKeys(identity);
  if (keys.length === 0) return;

  resolvedCardsSeen += 1;
  cardData.set(article, { identity, keys });
  applyHiddenState(article, keys);
  ensureControls(article, { identity, keys });
}

/** Mounts the card's controls if they are missing — on first sight or after a re-render wiped them. */
function ensureControls(article: HTMLElement, data: CardData): void {
  if (article.querySelector(`:scope > [${HOST_ATTR}]`)) return;

  const attempts = mountAttempts.get(article) ?? 0;
  if (attempts >= MAX_MOUNT_ATTEMPTS) return;
  mountAttempts.set(article, attempts + 1);

  try {
    mountCardControls(article, data.identity, data.keys);
    mountedCount += 1;
    if (attempts > 0) remountedCount += 1;
  } catch (err) {
    // Leave this card's visibility state intact; only the controls failed to mount.
    recordError(err);
  }
}

function applyHiddenState(article: HTMLElement, keys: string[]): void {
  if (store.isEnabled() && store.isHidden(keys)) {
    article.setAttribute("data-aoh", "hidden");
  } else {
    article.removeAttribute("data-aoh");
  }
}

function refreshVisibility(): void {
  document.querySelectorAll<HTMLElement>(`article[${SEEN_ATTR}]`).forEach((article) => {
    const data = cardData.get(article);
    if (data) applyHiddenState(article, data.keys);
  });
}

function evaluateCompatibility(): void {
  if (incompatible || resolvedCardsSeen > 0 || totalCardsSeen < INCOMPATIBLE_THRESHOLD) return;
  incompatible = true;
  observer?.disconnect();
  void store.setIncompatible(true);
}

/**
 * Content scripts run in an isolated world, so anything we put on `window` is
 * invisible to the page's own console. The DOM is the one thing both worlds
 * share, so diagnostics ride on an attribute: read it in DevTools with
 * `document.documentElement.dataset.aohDebug`.
 */
function publishDebug(): void {
  try {
    document.documentElement.setAttribute(
      DEBUG_ATTR,
      JSON.stringify({
        version: chrome.runtime.getManifest().version,
        total: totalCardsSeen,
        resolved: resolvedCardsSeen,
        mounted: mountedCount,
        remounted: remountedCount,
        hostsInDom: document.querySelectorAll(`[${HOST_ATTR}]`).length,
        incompatible,
        lastError,
      }),
    );
  } catch {
    // Diagnostics must never break the page.
  }
}
