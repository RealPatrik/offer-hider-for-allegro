import { hideKeys, identityFromUrl } from "../core/identity";
import { store } from "../core/store";
import { t } from "../core/i18n";
import type { Identity } from "../core/types";
import { escapeHtml } from "./dom-utils";

const STYLES = `
  :host { all: initial; }
  .banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font: 14px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 10px 14px;
    margin: 0 0 12px;
    border-radius: 8px;
    background: #f2f2f2;
    color: #222;
  }
  .banner.hidden { background: #fff3e0; }
  button {
    border: none;
    border-radius: 6px;
    background: #222;
    color: #fff;
    font: inherit;
    font-weight: 600;
    padding: 6px 12px;
    cursor: pointer;
  }
  .banner.hidden button { background: #b25e00; }
`;

export function mountOfferPageBanner(): void {
  try {
    const identity = identityFromUrl(location.href);
    const keys = hideKeys(identity);
    if (keys.length === 0) return;

    const existing = document.querySelector("h1");
    if (existing) {
      mountBanner(existing, keys, identity);
      return;
    }

    // The heading may only appear after client-side rendering finishes.
    const observer = new MutationObserver(() => {
      const heading = document.querySelector("h1");
      if (heading) {
        observer.disconnect();
        mountBanner(heading, keys, identity);
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  } catch {
    // The banner is a nice-to-have; a failure here must not break the offer page.
  }
}

function mountBanner(heading: Element, keys: string[], identity: Identity): void {
  const host = document.createElement("div");
  heading.insertAdjacentElement("beforebegin", host);
  const shadow = host.attachShadow({ mode: "open" });

  const render = (): void => {
    const hidden = store.isEnabled() && store.isHidden(keys);
    shadow.innerHTML = `
      <style>${STYLES}</style>
      <div class="banner ${hidden ? "hidden" : ""}">
        <span>${hidden ? escapeHtml(t("offerPageHiddenNotice")) : ""}</span>
        <button type="button">${escapeHtml(hidden ? t("offerPageUnhideButton") : t("offerPageHideButton"))}</button>
      </div>
    `;
    shadow.querySelector("button")?.addEventListener("click", () => {
      void toggle(hidden);
    });
  };

  async function toggle(currentlyHidden: boolean): Promise<void> {
    if (currentlyHidden) {
      for (const key of keys) await store.unhide(key);
      return;
    }
    const offerKey = keys.find((k) => k.startsWith("offer:")) ?? keys[0]!;
    await store.hide({
      key: offerKey,
      kind: "offer",
      name: document.title,
      market: identity.market,
      hiddenAt: Date.now(),
    });
  }

  render();
  store.onChange(render);
}
