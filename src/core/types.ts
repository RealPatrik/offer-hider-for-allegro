export type Market = "sk" | "pl" | "cz" | "hu";

export type HiddenKind = "offer" | "product" | "seller";

export interface HiddenEntry {
  key: string;
  kind: HiddenKind;
  name: string;
  market: Market | null;
  hiddenAt: number;
}

export interface Identity {
  offerId: string | null;
  productUuid: string | null;
  market: Market | null;
}

export interface SellerIdentity {
  key: string;
  name: string;
}

export interface Settings {
  enabled: boolean;
  locale: string | null;
}

export type HiddenMap = Record<string, HiddenEntry>;

export interface Diagnostics {
  incompatible: boolean;
}

export interface StoreState {
  schemaVersion: 1;
  hidden: HiddenMap;
  settings: Settings;
  diagnostics: Diagnostics;
}

export type ImportMode = "merge" | "replace";

export interface ImportResult {
  added: number;
  skipped: number;
}
