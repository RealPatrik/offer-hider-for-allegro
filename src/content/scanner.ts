import { hideKeys, identityFromCard } from "../core/identity";
import type { PageHideStatus } from "../core/page-status";
import { store } from "../core/store";
import { HOST_ATTR, mountCardControls, setCardTemporarilyVisible } from "./card-ui";
import type { Identity } from "../core/types";

const SEEN_ATTR = "data-aoh-seen";
const DEBUG_ATTR = "data-aoh-debug";
const OFFER_LINK_SELECTOR =
  'a[href*="offerId="], a[href*="/events/clicks"], a[href*="/oferta/"], a[href*="/ponuka/"], a[href*="/offer/"], a[href*="/item/"], a[href*="/produkt/"]';

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
const countedCandidates = new WeakSet<Element>();

let observer: MutationObserver | null = null;
let rafHandle: number | null = null;
let totalCardsSeen = 0;
let resolvedCardsSeen = 0;
let mountedCount = 0;
let remountedCount = 0;
let incompatible = false;
let lastError: { message: string; stack?: string } | null = null;
let temporarilyRevealed = false;
let pageKey = currentPageKey();

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
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["href"],
    });
  } catch (err) {
    recordError(err);
  }
  try {
    store.onChange(refreshVisibility);
  } catch (err) {
    recordError(err);
  }
}

/** Returns page-local state for the extension popup; no part of it is persisted. */
export function getPageHideStatus(): PageHideStatus {
  if (resetTemporaryRevealOnNavigation()) refreshVisibility();
  return {
    matchedCount: countMatchedCards(),
    temporarilyRevealed,
    hidingEnabled: store.isEnabled(),
  };
}

/** Shows matching cards only in this tab and only until this logical page changes. */
export function setTemporaryReveal(enabled: boolean): PageHideStatus {
  resetTemporaryRevealOnNavigation();
  temporarilyRevealed = enabled;
  refreshVisibility();
  publishDebug();
  return getPageHideStatus();
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
    if (resetTemporaryRevealOnNavigation()) refreshVisibility();
    // Sponsored and recommended cards can be rendered outside the first listing
    // container. Identity parsing is strict, so scanning every article keeps
    // those cards covered without attaching controls to unrelated content.
    document.querySelectorAll<HTMLElement>("article").forEach(processArticle);
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

  // A card with a resolved identity is final. Unresolved cards deliberately
  // remain retryable: Allegro often creates the article before hydrating its
  // destination href, especially for sponsored results.
  if (article.hasAttribute(SEEN_ATTR)) return;

  if (!article.querySelector(OFFER_LINK_SELECTOR)) return;
  if (!countedCandidates.has(article)) {
    countedCandidates.add(article);
    totalCardsSeen += 1;
  }

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

  article.setAttribute(SEEN_ATTR, "");
  resolvedCardsSeen += 1;
  cardData.set(article, { identity, keys });
  applyHiddenState(article, keys);
  ensureControls(article, { identity, keys });
}

/** Mounts the card's controls if they are missing — on first sight or after a re-render wiped them. */
function ensureControls(article: HTMLElement, data: CardData): void {
  if (article.querySelector(`[${HOST_ATTR}]`)) return;

  const attempts = mountAttempts.get(article) ?? 0;
  if (attempts >= MAX_MOUNT_ATTEMPTS) return;
  mountAttempts.set(article, attempts + 1);

  try {
    mountCardControls(article, data.identity, data.keys, isTemporarilyVisible(data.keys));
    mountedCount += 1;
    if (attempts > 0) remountedCount += 1;
  } catch (err) {
    // Leave this card's visibility state intact; only the controls failed to mount.
    recordError(err);
  }
}

function applyHiddenState(article: HTMLElement, keys: string[]): void {
  if (isTemporarilyVisible(keys)) {
    article.setAttribute("data-aoh", "temporarily-visible");
    setCardTemporarilyVisible(article, true);
  } else if (store.isEnabled() && store.isHidden(keys)) {
    article.setAttribute("data-aoh", "hidden");
    setCardTemporarilyVisible(article, false);
  } else {
    article.removeAttribute("data-aoh");
    setCardTemporarilyVisible(article, false);
  }
}

function refreshVisibility(): void {
  resetTemporaryRevealOnNavigation();
  document.querySelectorAll<HTMLElement>(`article[${SEEN_ATTR}]`).forEach((article) => {
    const data = cardData.get(article);
    if (data) applyHiddenState(article, data.keys);
  });
}

function isTemporarilyVisible(keys: string[]): boolean {
  return temporarilyRevealed && store.isEnabled() && store.isHidden(keys);
}

/** Counts affected result cards, not durable hiding rules. A card is counted once even for several keys. */
function countMatchedCards(): number {
  let count = 0;
  document.querySelectorAll<HTMLElement>(`article[${SEEN_ATTR}]`).forEach((article) => {
    const data = cardData.get(article);
    if (data && store.isHidden(data.keys)) count += 1;
  });
  return count;
}

function currentPageKey(): string {
  return `${location.origin}${location.pathname}${location.search}`;
}

function resetTemporaryRevealOnNavigation(): boolean {
  const nextPageKey = currentPageKey();
  if (nextPageKey === pageKey) return false;
  pageKey = nextPageKey;
  temporarilyRevealed = false;
  return true;
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
        matchedOnPage: countMatchedCards(),
        temporarilyRevealed,
        hostsInDom: document.querySelectorAll(`[${HOST_ATTR}]`).length,
        incompatible,
        lastError,
      }),
    );
  } catch {
    // Diagnostics must never break the page.
  }
}
