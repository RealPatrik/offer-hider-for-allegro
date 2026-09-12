# Privacy Policy for Offer Hider for Allegro

Effective date: September 12, 2026

Offer Hider for Allegro is a browser extension that lets users hide individual offers, products, and sellers while browsing supported Allegro marketplaces.

## Data handled by the extension

The extension processes a limited amount of website content locally in the user's browser in order to provide its stated functionality. This may include:

- offer identifiers and product identifiers contained in Allegro links;
- seller names visible on supported Allegro pages;
- the title of an offer selected by the user for hiding;
- the supported Allegro marketplace associated with the selected item;
- the time at which the user created a hiding rule;
- extension settings, such as whether hiding is enabled and the selected interface language.

The extension also checks which browser tab is active when its popup is opened so that it can display the number of matching hidden offers on the current supported Allegro page. The active tab URL and browsing history are not stored.

For Chrome Web Store disclosure purposes, the local processing of Allegro offer links and marketplace context is disclosed under Website content and Web history. The extension does not request the `history` permission, use the Chrome History API, or retain a list of pages the user has visited.

## How data is used

This information is used only to:

- identify offers, products, or sellers the user has chosen to hide;
- apply the user's hiding rules on supported Allegro pages;
- display and manage those rules in the extension popup;
- import or export the user's rules when the user explicitly requests it;
- diagnose whether a supported Allegro page layout has become incompatible with the extension.

## Storage and retention

Hiding rules and settings are stored only in `chrome.storage.local` on the user's device. They remain there until the user removes individual rules, replaces the stored data through the import function, clears the extension's data, or uninstalls the extension.

Exported JSON files are created only after the user selects the export action. Imported JSON files are read only after the user selects a file.

## Data collection, transmission, and sharing

The extension:

- does not send user data or browsing data to the developer or to any external server;
- does not use analytics, telemetry, advertising, tracking pixels, or cookies;
- does not sell, rent, or share user data with third parties;
- does not use remotely hosted code;
- does not create a user account and does not request authentication, payment, health, location, or personal communication data.

All functionality runs locally in the browser. The only network activity visible while using the extension is the activity performed by the Allegro website itself and the browser when loading that website.

## Permissions

The extension requests the `storage` permission solely to save the user's hiding rules and settings locally. Its content script runs only on `allegro.sk`, `allegro.pl`, `allegro.cz`, and `allegro.hu` so that it can identify offer cards and add the user-facing hiding controls.

## Limited Use

The use of information by Offer Hider for Allegro complies with the Chrome Web Store User Data Policy, including the Limited Use requirements. Data handled by the extension is used only to provide or improve its single user-facing purpose.

## Changes to this policy

If the extension's data practices change, this policy and the Chrome Web Store privacy disclosures will be updated before the changed behavior is released.

## Contact

Questions, privacy requests, and support reports can be submitted through the project's public issue tracker:

https://github.com/RealPatrik/offer-hider-for-allegro/issues

---

# Zásady ochrany súkromia pre Offer Hider for Allegro

Dátum účinnosti: 12. september 2026

Offer Hider for Allegro umožňuje používateľovi skryť konkrétne ponuky, produkty a predajcov na podporovaných trhoch Allegro.

Rozšírenie lokálne v prehliadači spracúva iba údaje potrebné na túto funkciu: identifikátory ponúk a produktov z odkazov Allegro, názvy predajcov a ponúk vybraných používateľom, príslušný trh, čas vytvorenia pravidla a nastavenia rozšírenia. Pri otvorení popupu skontroluje aktívnu kartu, aby vedelo zobraziť počet zhodných skrytých ponúk na aktuálnej stránke. URL aktívnej karty ani história prehliadania sa neukladajú.

Pravidlá a nastavenia sú uložené iba v `chrome.storage.local` na zariadení používateľa. Rozšírenie ich neposiela vývojárovi ani na externé servery, nepoužíva analytiku, telemetriu, reklamu, sledovacie pixely ani vzdialený kód a údaje nepredáva ani neposkytuje tretím stranám. Import a export sa vykoná iba po výslovnej akcii používateľa.

Používateľ môže údaje odstrániť obnovením jednotlivých položiek, nahradením údajov importom, vymazaním dát rozšírenia alebo jeho odinštalovaním. Otázky a žiadosti je možné poslať cez https://github.com/RealPatrik/offer-hider-for-allegro/issues.
