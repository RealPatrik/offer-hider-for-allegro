import { store } from "../core/store";
import { t } from "../core/i18n";
import { escapeHtml } from "./dom-utils";
import { createStyle, replaceContent } from "./trusted-html";

const VISIBLE_MS = 5000;

const STYLES = `
  :host { all: initial; }
  .bar {
    display: flex;
    align-items: center;
    gap: 12px;
    background: #222;
    color: #fff;
    font: 14px/1.4 -apple-system, "Segoe UI", Roboto, sans-serif;
    padding: 10px 16px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
  }
  button {
    background: none;
    border: none;
    color: #7ab8ff;
    font: inherit;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
  }
  button:hover { text-decoration: underline; }
`;

let hostEl: HTMLDivElement | null = null;
let shadow: ShadowRoot | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;
let pendingKeys: string[] = [];

export function showUndo(key: string): void {
  pendingKeys.push(key);
  ensureHost();
  render();
  resetTimer();
}

function ensureHost(): void {
  if (hostEl) return;
  hostEl = document.createElement("div");
  hostEl.style.position = "fixed";
  hostEl.style.left = "50%";
  hostEl.style.bottom = "24px";
  hostEl.style.transform = "translateX(-50%)";
  hostEl.style.zIndex = "2147483000";
  document.documentElement.appendChild(hostEl);
  shadow = hostEl.attachShadow({ mode: "open" });
  shadow.append(createStyle(STYLES));
}

function render(): void {
  if (!shadow) return;
  const label =
    pendingKeys.length > 1 ? t("undoHiddenMany", String(pendingKeys.length)) : t("undoHiddenOne");

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.setAttribute("role", "status");
  replaceContent(
    bar,
    `
    <span>${escapeHtml(label)}</span>
    <button type="button">${escapeHtml(t("undoButton"))}</button>
  `,
  );

  shadow.querySelectorAll(".bar").forEach((el) => el.remove());
  shadow.append(bar);
  bar.querySelector("button")?.addEventListener("click", () => {
    void undoAll();
  });
}

function resetTimer(): void {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(dismiss, VISIBLE_MS);
}

async function undoAll(): Promise<void> {
  const keys = pendingKeys;
  dismiss();
  for (const key of keys) {
    await store.unhide(key);
  }
}

function dismiss(): void {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = null;
  pendingKeys = [];
  hostEl?.remove();
  hostEl = null;
  shadow = null;
}
