import { sellerFromElement } from "../core/identity";
import { store } from "../core/store";
import { t } from "../core/i18n";
import type { HiddenKind, Identity } from "../core/types";
import { cardTitle, escapeHtml } from "./dom-utils";
import { appendHtml, createStyle, replaceContent } from "./trusted-html";
import { showUndo } from "./undo";

const STYLES = `
  :host { all: initial; }
  .wrap { position: relative; display: flex; gap: 2px; font: 13px/1 -apple-system, "Segoe UI", Roboto, sans-serif; }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.92);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.25);
    cursor: pointer;
    color: #222;
    padding: 0;
  }
  button:hover { background: #fff; }
  .chevron { width: 16px; }
  svg { width: 16px; height: 16px; }
  .menu {
    position: absolute;
    top: 32px;
    right: 0;
    display: flex;
    flex-direction: column;
    min-width: 180px;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25);
    overflow: hidden;
  }
  .menu[hidden] { display: none; }
  .menu button {
    all: unset;
    box-sizing: border-box;
    width: 100%;
    padding: 10px 12px;
    text-align: left;
    color: #222;
    cursor: pointer;
    border-radius: 0;
  }
  .menu button:hover { background: #f2f2f2; }
`;

const EYE_SLASH_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a21.77 21.77 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;
const CHEVRON_SVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`;

// One shared "click outside" listener for every card's menu, instead of one
// document-level listener per card — a listing page can have 70+ cards.
let closeOpenMenu: (() => void) | null = null;
let outsideClickBound = false;

function bindOutsideClickOnce(): void {
  if (outsideClickBound) return;
  outsideClickBound = true;
  document.addEventListener("click", () => closeOpenMenu?.());
}

export function mountCardControls(article: HTMLElement, identity: Identity, keys: string[]): void {
  bindOutsideClickOnce();

  if (getComputedStyle(article).position === "static") {
    article.style.position = "relative";
  }

  const host = document.createElement("div");
  host.style.position = "absolute";
  host.style.top = "8px";
  host.style.right = "8px";
  host.style.zIndex = "2147483000";
  article.appendChild(host);

  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(createStyle(STYLES));
  appendHtml(
    shadow,
    `
    <div class="wrap">
      <button class="icon" type="button" aria-label="${escapeHtml(t("hideIconLabel"))}" title="${escapeHtml(t("hideIconLabel"))}">${EYE_SLASH_SVG}</button>
      <button class="chevron" type="button" aria-label="${escapeHtml(t("hideMenuLabel"))}" aria-expanded="false">${CHEVRON_SVG}</button>
      <div class="menu" hidden role="menu"></div>
    </div>
  `,
  );

  const iconButton = shadow.querySelector<HTMLButtonElement>(".icon")!;
  const chevronButton = shadow.querySelector<HTMLButtonElement>(".chevron")!;
  const menu = shadow.querySelector<HTMLDivElement>(".menu")!;

  const offerKey = keys.find((k) => k.startsWith("offer:"));
  const productKey = keys.find((k) => k.startsWith("product:"));

  iconButton.addEventListener("click", (event) => {
    event.stopPropagation();
    void hide(offerKey ?? keys[0]!, "offer");
  });

  chevronButton.addEventListener("click", (event) => {
    event.stopPropagation();
    if (menu.hasAttribute("hidden")) openMenu();
    else closeMenu();
  });

  function openMenu(): void {
    const seller = sellerFromElement(article, identity.market);
    const items: string[] = [
      `<button type="button" data-action="offer" role="menuitem">${escapeHtml(t("hideOfferAction"))}</button>`,
    ];
    if (productKey) {
      items.push(
        `<button type="button" data-action="product" role="menuitem">${escapeHtml(t("hideProductAction"))}</button>`,
      );
    }
    if (seller) {
      items.push(
        `<button type="button" data-action="seller" role="menuitem">${escapeHtml(t("hideSellerAction"))}</button>`,
      );
    }
    replaceContent(menu, items.join(""));
    menu.removeAttribute("hidden");
    chevronButton.setAttribute("aria-expanded", "true");
    closeOpenMenu = closeMenu;

    menu.querySelectorAll<HTMLButtonElement>("button").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.stopPropagation();
        closeMenu();
        const action = btn.dataset.action;
        if (action === "offer" && offerKey) void hide(offerKey, "offer");
        else if (action === "product" && productKey) void hide(productKey, "product");
        else if (action === "seller" && seller) void hide(seller.key, "seller", seller.name);
      });
    });
  }

  function closeMenu(): void {
    menu.setAttribute("hidden", "");
    chevronButton.setAttribute("aria-expanded", "false");
    if (closeOpenMenu === closeMenu) closeOpenMenu = null;
  }

  async function hide(key: string, kind: HiddenKind, name?: string): Promise<void> {
    await store.hide({
      key,
      kind,
      name: name ?? cardTitle(article),
      market: identity.market,
      hiddenAt: Date.now(),
    });
    showUndo(key);
  }
}
