import { hideKeys, identityFromCard } from "../core/identity";
import { store } from "../core/store";
import { mountCardControls } from "./card-ui";

const LISTING_CONTAINER_SELECTOR = '[data-box-name="product listing items"]';

/** After this many cards we've inspected, zero resolved identities means the page layout changed. */
const INCOMPATIBLE_THRESHOLD = 20;

const seenKeys = new WeakMap<Element, string[]>();

let observer: MutationObserver | null = null;
let rafHandle: number | null = null;
let totalCardsSeen = 0;
let resolvedCardsSeen = 0;
let incompatible = false;

/** Exposed on window for in-page troubleshooting — see mountDebugHook() below. */
export const debugState = {
  get totalCardsSeen() {
    return totalCardsSeen;
  },
  get resolvedCardsSeen() {
    return resolvedCardsSeen;
  },
  mountedCount: 0,
  lastError: null as { message: string; stack?: string } | null,
};

function recordError(err: unknown): void {
  debugState.lastError = err instanceof Error ? { message: err.message, stack: err.stack } : { message: String(err) };
}

export function startScanning(): void {
  // Each concern gets its own guard: a failure in one (e.g. MutationObserver
  // being unavailable) must not prevent the others from still working.
  try {
    scan();
  } catch {
    // A bad initial scan must never break the host page.
  }
  try {
    observer = new MutationObserver(scheduleScan);
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    // Without an observer, late-arriving cards just won't be picked up.
  }
  try {
    store.onChange(refreshVisibility);
  } catch {
    // Without this, cross-tab/cross-context hide changes won't re-render live.
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
  } catch {
    // Swallow: one bad scan pass should not stop future ones from being scheduled.
  }
}

function processArticle(article: HTMLElement): void {
  if (article.hasAttribute("data-aoh-seen")) return;
  article.setAttribute("data-aoh-seen", "");
  totalCardsSeen += 1;

  let identity;
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
  seenKeys.set(article, keys);
  applyHiddenState(article, keys);

  try {
    mountCardControls(article, identity, keys);
    debugState.mountedCount += 1;
  } catch (err) {
    // Leave this card's visibility state as applied above; only the controls failed to mount.
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
  document.querySelectorAll<HTMLElement>("article[data-aoh-seen]").forEach((article) => {
    const keys = seenKeys.get(article);
    if (keys) applyHiddenState(article, keys);
  });
}

function evaluateCompatibility(): void {
  if (incompatible || resolvedCardsSeen > 0 || totalCardsSeen < INCOMPATIBLE_THRESHOLD) return;
  incompatible = true;
  observer?.disconnect();
  void store.setIncompatible(true);
}
