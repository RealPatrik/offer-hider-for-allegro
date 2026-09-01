import type { HiddenEntry, HiddenMap, ImportMode, ImportResult, Settings, StoreState } from "./types";

const STORAGE_KEY = "aoh";
const WRITE_DEBOUNCE_MS = 250;

const DEFAULT_SETTINGS: Settings = { enabled: true, locale: null };

function emptyState(): StoreState {
  return {
    schemaVersion: 1,
    hidden: {},
    settings: { ...DEFAULT_SETTINGS },
    diagnostics: { incompatible: false },
  };
}

function isStoreState(value: unknown): value is StoreState {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.schemaVersion === 1 && typeof v.hidden === "object" && v.hidden !== null;
}

/** Fills in fields added to the schema after a user's stored state was written. */
function withDefaults(state: StoreState): StoreState {
  const raw = state as Partial<StoreState>;
  return {
    schemaVersion: 1,
    hidden: raw.hidden ?? {},
    settings: { ...DEFAULT_SETTINGS, ...raw.settings },
    diagnostics: { incompatible: false, ...raw.diagnostics },
  };
}

export class Store {
  private state: StoreState = emptyState();
  private readonly loaded: Promise<void>;
  private writeTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.loaded = this.load();
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area !== "local" || !changes[STORAGE_KEY]) return;
      const next = changes[STORAGE_KEY].newValue as StoreState | undefined;
      if (next && isStoreState(next)) {
        this.state = withDefaults(next);
        this.notify();
      }
    });
  }

  private async load(): Promise<void> {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const stored = result[STORAGE_KEY];
    if (isStoreState(stored)) this.state = withDefaults(stored);
  }

  ready(): Promise<void> {
    return this.loaded;
  }

  private notify(): void {
    for (const listener of this.listeners) listener();
  }

  onChange(cb: () => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private scheduleWrite(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.writeTimer = null;
      void chrome.storage.local.set({ [STORAGE_KEY]: this.state });
    }, WRITE_DEBOUNCE_MS);
  }

  /** Synchronous on purpose: scanner calls this in a hot loop while walking the DOM. */
  isHidden(keys: string[]): boolean {
    return keys.some((key) => key in this.state.hidden);
  }

  isEnabled(): boolean {
    return this.state.settings.enabled;
  }

  async hide(entry: HiddenEntry): Promise<void> {
    await this.ready();
    this.state.hidden[entry.key] = entry;
    this.notify();
    this.scheduleWrite();
  }

  async unhide(key: string): Promise<void> {
    await this.ready();
    delete this.state.hidden[key];
    this.notify();
    this.scheduleWrite();
  }

  list(filter = ""): HiddenEntry[] {
    const needle = filter.trim().toLowerCase();
    const entries = Object.values(this.state.hidden);
    const filtered = needle ? entries.filter((e) => e.name.toLowerCase().includes(needle)) : entries;
    return filtered.sort((a, b) => b.hiddenAt - a.hiddenAt);
  }

  count(): number {
    return Object.keys(this.state.hidden).length;
  }

  async getSettings(): Promise<Settings> {
    await this.ready();
    return { ...this.state.settings };
  }

  async setSettings(partial: Partial<Settings>): Promise<void> {
    await this.ready();
    this.state.settings = { ...this.state.settings, ...partial };
    this.notify();
    this.scheduleWrite();
  }

  isIncompatible(): boolean {
    return this.state.diagnostics.incompatible;
  }

  async setIncompatible(value: boolean): Promise<void> {
    await this.ready();
    if (this.state.diagnostics.incompatible === value) return;
    this.state.diagnostics = { incompatible: value };
    this.notify();
    this.scheduleWrite();
  }

  exportJson(): string {
    return JSON.stringify(this.state, null, 2);
  }

  async importJson(text: string, mode: ImportMode): Promise<ImportResult> {
    await this.ready();

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error("invalid-json");
    }
    if (!isStoreState(parsed)) throw new Error("invalid-schema");

    let added = 0;
    let skipped = 0;
    const nextHidden: HiddenMap = mode === "replace" ? {} : { ...this.state.hidden };

    for (const [key, entry] of Object.entries(parsed.hidden)) {
      if (mode === "merge" && key in nextHidden) {
        skipped += 1;
        continue;
      }
      nextHidden[key] = entry;
      added += 1;
    }

    this.state = {
      schemaVersion: 1,
      hidden: nextHidden,
      settings: this.state.settings,
      diagnostics: this.state.diagnostics,
    };
    this.notify();
    this.scheduleWrite();
    return { added, skipped };
  }
}

export const store = new Store();
