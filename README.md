# Offer Hider for Allegro

Offer Hider for Allegro is a Manifest V3 Chrome extension for hiding unwanted offers, products, and sellers in Allegro search results.

## Features

- Hide one offer, all offers for a product, or a seller when a stable identity is available.
- Works with regular and sponsored search-result cards.
- Remembers hiding rules locally across page reloads.
- Shows how many matching offers are hidden on the current page.
- Temporarily reveals hidden offers without deleting the user's rules.
- Provides search, restore, import, and export tools in the popup.
- Includes English, Slovak, Polish, Czech, and Hungarian interfaces.

Supported marketplaces: `allegro.sk`, `allegro.pl`, `allegro.cz`, and `allegro.hu`.

## Privacy

The extension works locally and does not send browsing or user data to the developer or any external service. See the full [Privacy Policy](PRIVACY.md).

## Install locally

1. Run `npm install`.
2. Run `npm run build`.
3. Open `chrome://extensions` in Chrome.
4. Enable Developer mode.
5. Select **Load unpacked** and choose the generated `dist` directory.
6. Reload any already-open Allegro tabs.

## Build and test

```sh
npm run typecheck
npm test
npm run build
npm run zip
```

## Support

Report bugs and feature requests in [GitHub Issues](https://github.com/RealPatrik/offer-hider-for-allegro/issues).

Offer Hider for Allegro is an independent browser extension and is not affiliated with, endorsed by, or sponsored by Allegro.
