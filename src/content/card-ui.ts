import { sellerFromElement } from "../core/identity";
import { store } from "../core/store";
import { t } from "../core/i18n";
import type { HiddenKind, Identity } from "../core/types";
import { cardTitle, escapeHtml } from "./dom-utils";
import { appendHtml, createStyle, replaceContent } from "./trusted-html";
import { showUndo } from "./undo";

const STYLES = `
  :host { all: initial; }
  .wrap { position: relative; display: flex; align-items: stretch; font: 13px/1 -apple-system, "Segoe UI", Roboto, sans-serif; }
  button {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    border: 1px solid #c8c8c8;
    background: #fff;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    cursor: pointer;
    color: #252525;
    padding: 0;
  }
  button:hover { background: #f6f6f6; }
  button:focus-visible { outline: 3px solid #ff5a00; outline-offset: 2px; }
  .icon { width: 32px; border-radius: 8px 0 0 8px; border-right: 0; }
  .chevron { width: 22px; border-radius: 0 8px 8px 0; }
  .temporary-status {
    display: inline-flex;
    align-items: center;
    min-height: 24px;
    margin-left: 8px;
    padding: 0 8px;
    border-radius: 999px;
    background: #fff0e8;
    color: #a53a10;
    font-size: 11px;
    font-weight: 650;
    white-space: nowrap;
  }
  .temporary-status[hidden] { display: none; }
  svg { width: 16px; height: 16px; }
  .menu {
    position: absolute;
    bottom: 38px;
    right: 0;
    display: flex;
    flex-direction: column;
    min-width: 196px;
    background: #fff;
    border-radius: 8px;
    border: 1px solid #dedede;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
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

/** Marks our injected shadow host so the scanner can tell whether a re-render wiped it. */
export const HOST_ATTR = "data-aoh-host";

// One shared "click outside" listener for every card's menu, instead of one
// document-level listener per card — a listing page can have 70+ cards.
let closeOpenMenu: (() => void) | null = null;
let outsideClickBound = false;

function bindOutsideClickOnce(): void {
  if (outsideClickBound) return;
  outsideClickBound = true;
  document.addEventListener("click", () => closeOpenMenu?.());
}

export function mountCardControls(
  article: HTMLElement,
  identity: Identity,
  keys: string[],
  temporarilyVisible = false,
): void {
  bindOutsideClickOnce();

  const host = document.createElement("div");
  host.setAttribute(HOST_ATTR, "");
  host.style.zIndex = "2147483000";

  // The cart button is a stable Allegro attribute and gives the action a
  // semantic, lower-card home. It avoids covering seller logos and product
  // media in the upper-right corner of cards.
  const cartButton = article.querySelector<HTMLElement>('[data-role-type="add-to-cart-button"]');
  if (cartButton?.parentElement) {
    host.style.position = "relative";
    host.style.flex = "0 0 auto";
    cartButton.insertAdjacentElement("afterend", host);
  } else {
    // Some recommendation cards do not expose an add-to-cart button. Keep the
    // control in normal document flow rather than overlaying unknown content.
    host.style.position = "relative";
    host.style.display = "block";
    host.style.width = "fit-content";
    host.style.margin = "8px 8px 8px auto";
    article.appendChild(host);
  }

  const shadow = host.attachShadow({ mode: "open" });
  shadow.append(createStyle(STYLES));
  appendHtml(
    shadow,
    `
    <div class="wrap">
      <button class="icon" type="button" aria-label="${escapeHtml(t("hideIconLabel"))}" title="${escapeHtml(t("hideIconLabel"))}">${EYE_SLASH_SVG}</button>
      <button class="chevron" type="button" aria-label="${escapeHtml(t("hideMenuLabel"))}" aria-expanded="false">${CHEVRON_SVG}</button>
      <span class="temporary-status" role="status" ${temporarilyVisible ? "" : "hidden"}>${escapeHtml(t("cardTemporarilyVisible"))}</span>
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

/** Updates the existing lower-card status pill without remounting the controls. */
export function setCardTemporarilyVisible(article: HTMLElement, visible: boolean): void {
  const status = article
    .querySelector<HTMLElement>(`[${HOST_ATTR}]`)
    ?.shadowRoot?.querySelector<HTMLElement>(".temporary-status");
  if (!status) return;
  status.toggleAttribute("hidden", !visible);
}
