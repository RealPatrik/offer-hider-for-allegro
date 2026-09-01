import { store } from "../core/store";
import { setLocaleOverride, SUPPORTED_LOCALES, t, type LocaleCode } from "../core/i18n";
import type { HiddenEntry, ImportMode } from "../core/types";
import "./popup.css";

const app = document.getElementById("app")!;

let currentFilter = "";
let currentLocale: string | null = null;

async function main(): Promise<void> {
  await store.ready();
  const settings = await store.getSettings();
  currentLocale = settings.locale;
  if (settings.locale) await setLocaleOverride(settings.locale as LocaleCode);

  renderShell();
  store.onChange(renderShell);
}

function renderShell(): void {
  app.innerHTML = template();
  wireEvents();
}

function template(): string {
  return `
    <header>
      <h1>${escapeHtml(t("popupTitle"))}</h1>
      <label class="toggle">
        <input type="checkbox" id="enabledToggle" ${store.isEnabled() ? "checked" : ""} />
        <span>${escapeHtml(t("popupEnabledToggle"))}</span>
      </label>
    </header>
    ${store.isIncompatible() ? `<div class="notice">${escapeHtml(t("popupIncompatibleNotice"))}</div>` : ""}
    <div class="toolbar">
      <input type="search" id="search" placeholder="${escapeHtml(t("popupSearchPlaceholder"))}" value="${escapeHtml(currentFilter)}" />
      <span id="count" class="count">${escapeHtml(t("popupCountLabel", String(store.count())))}</span>
    </div>
    <ul id="list" class="list">${renderListItems()}</ul>
    <footer>
      <div class="actions">
        <button id="exportBtn" type="button">${escapeHtml(t("popupExportButton"))}</button>
        <select id="importMode">
          <option value="merge">${escapeHtml(t("popupImportMergeLabel"))}</option>
          <option value="replace">${escapeHtml(t("popupImportReplaceLabel"))}</option>
        </select>
        <label class="import-btn">
          ${escapeHtml(t("popupImportButton"))}
          <input type="file" id="importFile" accept="application/json" hidden />
        </label>
      </div>
      <div class="lang">
        <label for="langSelect">${escapeHtml(t("popupLanguageLabel"))}</label>
        <select id="langSelect">
          <option value="">${escapeHtml(t("popupLanguageAuto"))}</option>
          ${SUPPORTED_LOCALES.map(localeOption).join("")}
        </select>
      </div>
    </footer>
  `;
}

function localeOption(locale: string): string {
  const selected = currentLocale === locale ? "selected" : "";
  const label = t(`localeName${capitalize(locale)}`);
  return `<option value="${locale}" ${selected}>${escapeHtml(label)}</option>`;
}

function renderListItems(): string {
  const entries = store.list(currentFilter);
  if (entries.length === 0) {
    return `<li class="empty">${escapeHtml(t("popupEmptyState"))}</li>`;
  }
  return entries.map(renderEntry).join("");
}

function renderEntry(entry: HiddenEntry): string {
  return `
    <li>
      <div class="meta">
        <span class="kind">${escapeHtml(t(kindKey(entry)))}</span>
        <span class="name" title="${escapeHtml(entry.name || entry.key)}">${escapeHtml(entry.name || entry.key)}</span>
      </div>
      <button type="button" data-restore="${escapeHtml(entry.key)}">${escapeHtml(t("popupRestoreButton"))}</button>
    </li>
  `;
}

function kindKey(entry: HiddenEntry): string {
  if (entry.kind === "offer") return "kindOffer";
  if (entry.kind === "product") return "kindProduct";
  return "kindSeller";
}

function wireEvents(): void {
  document.getElementById("enabledToggle")?.addEventListener("change", (event) => {
    void store.setSettings({ enabled: (event.target as HTMLInputElement).checked });
  });

  const search = document.getElementById("search") as HTMLInputElement | null;
  search?.addEventListener("input", () => {
    currentFilter = search.value;
    const list = document.getElementById("list");
    if (list) list.innerHTML = renderListItems();
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
