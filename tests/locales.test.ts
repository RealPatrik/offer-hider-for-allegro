import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SUPPORTED_LOCALES } from "../src/core/i18n";

type Messages = Record<string, { message: string }>;

function readMessages(locale: string): Messages {
  const path = join(process.cwd(), "_locales", locale, "messages.json");
  return JSON.parse(readFileSync(path, "utf8")) as Messages;
}

describe("locale files", () => {
  const en = readMessages("en");
  const enKeys = Object.keys(en).sort();

  it("has a non-empty English baseline", () => {
    expect(enKeys.length).toBeGreaterThan(0);
  });

  for (const locale of SUPPORTED_LOCALES) {
    if (locale === "en") continue;

    it(`${locale} defines exactly the same keys as en, all non-empty`, () => {
      const messages = readMessages(locale);
      expect(Object.keys(messages).sort()).toEqual(enKeys);
      for (const key of enKeys) {
        expect(messages[key]?.message.trim()).not.toBe("");
      }
    });
  }
});
