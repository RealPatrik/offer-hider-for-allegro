import { store } from "../core/store";
import { isPageStatusMessage } from "../core/page-status";
import { setLocaleOverride, type LocaleCode } from "../core/i18n";
import { mountOfferPageBanner } from "./offer-page";
import { debugState, getPageHideStatus, setTemporaryReveal, startScanning } from "./scanner";

// Content scripts run in an isolated world, so this is only reachable from a
// DevTools console whose context is switched to the extension. For the page
// console, the scanner also publishes the same numbers to a DOM attribute:
// `document.documentElement.dataset.aohDebug`.
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

const bootstrapped = bootstrap();

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  if (!isPageStatusMessage(message)) return;

  void bootstrapped
    .then(() => {
      if (message.type === "aoh:get-page-status") {
        sendResponse(getPageHideStatus());
        return;
      }
      sendResponse(setTemporaryReveal(message.enabled));
    })
    .catch(() => {
      // The popup treats a missing response as unavailable; content scripts
      // must never leak an internal error to the page.
      sendResponse(undefined);
    });

  return true;
});
