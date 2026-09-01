import { store } from "../core/store";
import { setLocaleOverride, type LocaleCode } from "../core/i18n";
import { mountOfferPageBanner } from "./offer-page";
import { startScanning } from "./scanner";

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
