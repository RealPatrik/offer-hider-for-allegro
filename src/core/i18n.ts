export type LocaleCode = "en" | "pl" | "sk" | "hu" | "cs";

export const SUPPORTED_LOCALES: LocaleCode[] = ["en", "pl", "sk", "hu", "cs"];

type Messages = Record<string, { message: string }>;

let overrideMessages: Messages | null = null;

export async function setLocaleOverride(locale: LocaleCode | null): Promise<void> {
  if (!locale) {
    overrideMessages = null;
    return;
  }
  const url = chrome.runtime.getURL(`_locales/${locale}/messages.json`);
  const response = await fetch(url);
  overrideMessages = (await response.json()) as Messages;
}

export function t(key: string, ...args: string[]): string {
  const raw = overrideMessages?.[key]?.message ?? chrome.i18n.getMessage(key) ?? key;
  return applyArgs(raw, args);
}

function applyArgs(message: string, args: string[]): string {
  if (args.length === 0) return message;
  return message.replace(/\{(\d+)\}/g, (_match, index: string) => args[Number(index)] ?? "");
}
