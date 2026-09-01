import { store } from "../core/store";
import { setLocaleOverride, type LocaleCode } from "../core/i18n";
import { mountOfferPageBanner } from "./offer-page";
import { debugState, startScanning } from "./scanner";

// In-page troubleshooting handle: run `window.__offerHiderDebug` in DevTools
// console on an Allegro page to see how many cards were found, resolved, and
// actually got controls mounted, plus the last error if any mount failed.
(window as unknown as Record<string, unknown>).__offerHiderDebug = debugState;

async function bootstrap(): Promise<void> {
  await store.ready();

  const settings = await store.getSettings();
  if (settings.locale) {
    await setLocaleOverride(settings.locale as LocaleCode);
  }

  startScanning();
  mountOfferPageBanner();
}

void bootstrap();
