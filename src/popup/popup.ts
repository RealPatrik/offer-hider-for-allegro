import { store } from "../core/store";
import { setLocaleOverride, SUPPORTED_LOCALES, t, type LocaleCode } from "../core/i18n";
import { isPageHideStatus, type PageHideStatus, type PageStatusMessage } from "../core/page-status";
import type { HiddenEntry, ImportMode } from "../core/types";
import "./popup.css";

const app = document.getElementById("app")!;

let currentFilter = "";
let currentLocale: string | null = null;
type PageContext =
  | { state: "loading" }
  | { state: "ready"; status: PageHideStatus }
  | { state: "unavailable" };

let pageContext: PageContext = { state: "loading" };
let pageActionPending = false;

async function main(): Promise<void> {
  await store.ready();
  const settings = await store.getSettings();
  currentLocale = settings.locale;
  if (settings.locale) await setLocaleOverride(settings.locale as LocaleCode);

  renderShell();
  store.onChange(renderShell);
  await refreshPageContext();
}

function renderShell(): void {
  app.innerHTML = template();
  wireEvents();
}

function template(): string {
  const enabled = store.isEnabled();
  const entries = store.list();
  const filteredEntries = store.list(currentFilter);
  const summary = summarize(entries);

  return `
    <main class="popup-shell">
      <header class="hero">
        <div class="brand">
          <img class="brand-icon" src="../icons/32.png" alt="" />
          <div>
            <h1>${escapeHtml(t("popupTitle"))}</h1>
            <p class="status ${enabled ? "enabled" : "paused"}">${escapeHtml(
              t(enabled ? "popupStatusEnabled" : "popupStatusPaused"),
            )}</p>
          </div>
        </div>
        <label class="switch" title="${escapeHtml(t("popupEnabledToggle"))}">
          <input type="checkbox" id="enabledToggle" ${enabled ? "checked" : ""} aria-label="${escapeHtml(
            t("popupEnabledToggle"),
          )}" />
          <span class="slider" aria-hidden="true"></span>
        </label>
      </header>

      ${enabled ? "" : `<p class="paused-notice">${escapeHtml(t("popupPausedNotice"))}</p>`}
      ${store.isIncompatible() ? `<div class="notice">${escapeHtml(t("popupIncompatibleNotice"))}</div>` : ""}
      ${renderPageContext(enabled)}

      <section class="summary" aria-label="${escapeHtml(t("popupCountLabel", String(entries.length)))}">
        <div>
          <p class="eyebrow">${escapeHtml(t("popupCountLabel", String(entries.length)))}</p>
          <h2>${escapeHtml(t("popupHiddenItemsHeading"))}</h2>
        </div>
        <div class="chips" aria-label="${escapeHtml(t("popupHiddenItemsHeading"))}">
          ${summaryChip("offer", t("popupSummaryOffers", String(summary.offer)))}
          ${summaryChip("product", t("popupSummaryProducts", String(summary.product)))}
          ${summaryChip("seller", t("popupSummarySellers", String(summary.seller)))}
        </div>
      </section>

      <section class="list-section">
        <label class="search-field" for="search">
          <span aria-hidden="true">⌕</span>
          <input type="search" id="search" placeholder="${escapeHtml(t("popupSearchPlaceholder"))}" value="${escapeHtml(
            currentFilter,
          )}" />
        </label>
        <p class="results-count" id="resultsCount">${escapeHtml(
          t("popupSearchResultsCount", String(filteredEntries.length), String(entries.length)),
        )}</p>
        <ul id="list" class="list" aria-label="${escapeHtml(t("popupListLabel"))}">${renderListItems(
          filteredEntries,
        )}</ul>
      </section>

      <footer>
        <details class="data-tools">
          <summary>
            <span>${escapeHtml(t("popupDataTools"))}</span>
            <span class="summary-arrow" aria-hidden="true">⌄</span>
          </summary>
          <p>${escapeHtml(t("popupDataToolsDescription"))}</p>
          <div class="data-actions">
            <button id="exportBtn" type="button" class="secondary-button">${escapeHtml(t("popupExportButton"))}</button>
            <label class="secondary-button import-btn">
              ${escapeHtml(t("popupImportButton"))}
              <input type="file" id="importFile" accept="application/json" hidden />
            </label>
          </div>
          <label class="select-row" for="importMode">
            <span>${escapeHtml(t("popupImportModeLabel"))}</span>
            <select id="importMode">
              <option value="merge">${escapeHtml(t("popupImportMergeLabel"))}</option>
              <option value="replace">${escapeHtml(t("popupImportReplaceLabel"))}</option>
            </select>
          </label>
        </details>
        <label class="select-row language-row" for="langSelect">
          <span>${escapeHtml(t("popupLanguageLabel"))}</span>
          <select id="langSelect">
            <option value="">${escapeHtml(t("popupLanguageAuto"))}</option>
            ${SUPPORTED_LOCALES.map(localeOption).join("")}
          </select>
        </label>
      </footer>
    </main>
  `;
}

function renderPageContext(enabled: boolean): string {
  if (pageContext.state === "loading") {
    return `
      <section class="page-context page-context-loading" aria-busy="true">
        <p>${escapeHtml(t("popupPageContextLoading"))}</p>
      </section>
    `;
  }

  if (pageContext.state === "unavailable") {
    return `
      <section class="page-context page-context-unavailable">
        <p>${escapeHtml(t("popupPageContextUnavailable"))}</p>
      </section>
    `;
  }

  const { matchedCount, temporarilyRevealed } = pageContext.status;
  let description: string;
  let action = "";

  if (!enabled) {
    description = t(
      matchedCount > 0 ? "popupPageWouldHideCount" : "popupPageNoHiddenItems",
      String(matchedCount),
    );
  } else if (matchedCount === 0) {
    description = t("popupPageNoHiddenItems");
  } else {
    description = t(
      temporarilyRevealed ? "popupPageTemporarilyRevealedCount" : "popupPageHiddenCount",
      String(matchedCount),
    );
    const buttonKey = temporarilyRevealed ? "popupHideAgainButton" : "popupTemporaryRevealButton";
    action = `
      <button
        id="pageRevealButton"
        class="page-context-action"
        type="button"
        aria-pressed="${temporarilyRevealed}"
        ${pageActionPending ? "disabled" : ""}
      >${escapeHtml(t(pageActionPending ? "popupPageActionPending" : buttonKey))}</button>
    `;
  }

  return `
    <section class="page-context ${temporarilyRevealed ? "page-context-revealed" : ""}">
      <div>
        <p class="page-context-heading">${escapeHtml(t("popupPageContextHeading"))}</p>
        <p class="page-context-description" aria-live="polite">${escapeHtml(description)}</p>
        ${temporarilyRevealed ? `<p class="page-context-note">${escapeHtml(t("popupTemporaryRevealNotice"))}</p>` : ""}
      </div>
      ${action}
    </section>
  `;
}

function summaryChip(kind: HiddenEntry["kind"], label: string): string {
  return `<span class="chip chip-${kind}">${escapeHtml(label)}</span>`;
}

function summarize(entries: HiddenEntry[]): Record<HiddenEntry["kind"], number> {
  return entries.reduce<Record<HiddenEntry["kind"], number>>(
    (counts, entry) => {
      counts[entry.kind] += 1;
      return counts;
    },
    { offer: 0, product: 0, seller: 0 },
  );
}

function localeOption(locale: string): string {
  const selected = currentLocale === locale ? "selected" : "";
  const label = t(`localeName${capitalize(locale)}`);
  return `<option value="${locale}" ${selected}>${escapeHtml(label)}</option>`;
}

function renderListItems(entries: HiddenEntry[]): string {
  if (entries.length === 0) {
    return `
      <li class="empty">
        <span class="empty-icon" aria-hidden="true">◉</span>
        <strong>${escapeHtml(t("popupEmptyState"))}</strong>
        <span>${escapeHtml(t("popupEmptyDescription"))}</span>
      </li>
    `;
  }
  return entries.map(renderEntry).join("");
}

function renderEntry(entry: HiddenEntry): string {
  const name = entry.name || entry.key;
  return `
    <li class="entry">
      <div class="entry-copy">
        <div class="entry-meta">
          <span class="kind kind-${entry.kind}">${escapeHtml(t(kindKey(entry)))}</span>
          <span class="market">${escapeHtml(marketLabel(entry.market))}</span>
        </div>
        <span class="name" title="${escapeHtml(name)}">${escapeHtml(name)}</span>
        <span class="hidden-at">${escapeHtml(t("popupHiddenOn", formatHiddenAt(entry.hiddenAt)))}</span>
      </div>
      <button type="button" class="restore" data-restore="${escapeHtml(entry.key)}" aria-label="${escapeHtml(
        t("popupRestoreLabel", name),
      )}">${escapeHtml(t("popupRestoreButton"))}</button>
    </li>
  `;
}

function marketLabel(market: HiddenEntry["market"]): string {
  return market ? `allegro.${market}` : "Allegro";
}

function formatHiddenAt(timestamp: number): string {
  const locale = currentLocale || undefined;
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(timestamp),
  );
}

function kindKey(entry: HiddenEntry): string {
  if (entry.kind === "offer") return "kindOffer";
  if (entry.kind === "product") return "kindProduct";
  return "kindSeller";
}

function wireEvents(): void {
  document.getElementById("enabledToggle")?.addEventListener("change", (event) => {
    void store.setSettings({ enabled: (event.target as HTMLInputElement).checked }).then(refreshPageContext);
  });

  document.getElementById("pageRevealButton")?.addEventListener("click", () => {
    void toggleTemporaryReveal();
  });

  const search = document.getElementById("search") as HTMLInputElement | null;
  search?.addEventListener("input", () => {
    currentFilter = search.value;
    const entries = store.list();
    const filteredEntries = store.list(currentFilter);
    const list = document.getElementById("list");
    const resultsCount = document.getElementById("resultsCount");
    if (list) list.innerHTML = renderListItems(filteredEntries);
    if (resultsCount) {
      resultsCount.textContent = t("popupSearchResultsCount", String(filteredEntries.length), String(entries.length));
    }
  });

  document.getElementById("list")?.addEventListener("click", (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>("button[data-restore]");
    if (!button) return;
    void store.unhide(button.dataset.restore!);
  });

  document.getElementById("exportBtn")?.addEventListener("click", downloadExport);

  const importFile = document.getElementById("importFile") as HTMLInputElement | null;
  importFile?.addEventListener("change", () => {
    const file = importFile.files?.[0];
    if (file) void handleImport(file);
    importFile.value = "";
  });

  const langSelect = document.getElementById("langSelect") as HTMLSelectElement | null;
  langSelect?.addEventListener("change", () => {
    void changeLocale(langSelect.value || null);
  });
}

async function refreshPageContext(): Promise<void> {
  try {
    pageContext = { state: "ready", status: await sendPageMessage({ type: "aoh:get-page-status" }) };
  } catch {
    pageContext = { state: "unavailable" };
  }
  renderShell();
}

async function toggleTemporaryReveal(): Promise<void> {
  if (pageContext.state !== "ready" || pageActionPending || !store.isEnabled()) return;

  pageActionPending = true;
  renderShell();
  try {
    const status = await sendPageMessage({
      type: "aoh:set-temporary-reveal",
      enabled: !pageContext.status.temporarilyRevealed,
    });
    pageContext = { state: "ready", status };
    pageActionPending = false;
    renderShell();
    window.setTimeout(() => window.close(), 160);
  } catch {
    pageActionPending = false;
    pageContext = { state: "unavailable" };
    renderShell();
  }
}

async function sendPageMessage(message: PageStatusMessage): Promise<PageHideStatus> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (typeof tab?.id !== "number") throw new Error("no-active-tab");
  const response: unknown = await chrome.tabs.sendMessage(tab.id, message);
  if (!isPageHideStatus(response)) throw new Error("invalid-page-status");
  return response;
}

function downloadExport(): void {
  const json = store.exportJson();
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `offer-hider-for-allegro-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

async function handleImport(file: File): Promise<void> {
  const modeSelect = document.getElementById("importMode") as HTMLSelectElement | null;
  const mode: ImportMode = modeSelect?.value === "replace" ? "replace" : "merge";
  if (mode === "replace" && !window.confirm(t("popupImportReplaceConfirm"))) return;

  try {
    const text = await file.text();
    const result = await store.importJson(text, mode);
    showToast(t("importResultSummary", String(result.added), String(result.skipped)));
  } catch {
    showToast(t("importInvalidFile"));
  }
}

async function changeLocale(locale: string | null): Promise<void> {
  currentLocale = locale;
  await store.setSettings({ locale });
  await setLocaleOverride(locale as LocaleCode | null);
  renderShell();
}

function showToast(message: string): void {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

void main();
