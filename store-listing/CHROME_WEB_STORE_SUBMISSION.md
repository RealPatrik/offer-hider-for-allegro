# Publikovanie Offer Hider for Allegro v Chrome Web Store

Tento dokument obsahuje pripravené odpovede pre verziu 0.1.3 a presný postup, ktorý treba dokončiť v Chrome Web Store Developer Dashboard.

## 1. Založenie a nastavenie vývojárskeho účtu

1. Otvor https://chrome.google.com/webstore/devconsole.
2. Prihlás sa Google účtom, ktorý má zostať vlastníkom rozšírenia. E-mail účtu sa neskôr nedá jednoducho zmeniť, preto je vhodný stabilný účet určený na publikovanie.
3. Dokonči jednorazovú registráciu vývojára a uhraď registračný poplatok zobrazený Googlom.
4. Zapni dvojstupňové overenie Google účtu. Bez neho Google neumožní publikovať ani aktualizovať rozšírenie.
5. V časti `Account` over kontaktný e-mail.
6. Nastav názov vydavateľa. Odporúčaný verejný názov: `RealPatrik`.
7. Vyber pravdivý stav `Trader` alebo `Non-trader`. Toto je právne sebaposúdenie vydavateľa, nie technické nastavenie rozšírenia.
8. Ak vyberieš `Trader`, priprav na overenie právne meno alebo názov firmy, adresu, verejný kontaktný e-mail, telefón s SMS a prípadné firemné doklady. Overené kontaktné údaje obchodníka sa môžu verejne zobraziť v Store.
9. Zapni e-mailové upozornenia na výsledok kontroly a podporu používateľov.

## 2. Vytvorenie položky a nahratie balíka

1. V Developer Dashboard klikni `Add new item`.
2. Vyber súbor `chrome-web-store/offer-hider-for-allegro-0.1.3-cws.zip`.
3. Počkaj na validáciu balíka. `manifest.json` musí byť priamo v koreňovom adresári ZIP súboru.
4. Skontroluj, že Dashboard zobrazil:
   - Name: `Offer Hider for Allegro`
   - Version: `0.1.3`
   - Manifest version: `3`
   - Permission: `storage`
   - Site access: `allegro.sk`, `allegro.pl`, `allegro.cz`, `allegro.hu`

## 3. Store Listing

V karte `Store Listing` vyplň:

1. Default language: `English`.
2. Detailed description: vlož anglický text zo súboru `CHROME_WEB_STORE_LISTING.md`, časť `Default listing: English`.
3. Category: `Shopping`.
4. Homepage URL: `https://github.com/RealPatrik/offer-hider-for-allegro`.
5. Support URL: `https://github.com/RealPatrik/offer-hider-for-allegro/issues`.
6. Store icon: načíta sa 128 × 128 PNG z balíka. Skontroluj jeho náhľad.
7. Screenshots: nahraj v tomto poradí:
   - `store-assets/screenshots/01-hide-controls-1280x800.png`
   - `store-assets/screenshots/02-hide-and-undo-1280x800.png`
8. Small promo tile: nahraj `store-assets/promotional/small-promo-440x280.png`.
9. Marquee image: voliteľne nahraj `store-assets/promotional/marquee-1400x560.png`.
10. Ak Dashboard ponúkne video, nechaj pole prázdne; video nie je potrebné.
11. Pridaj lokalizácie `Slovak`, `Polish`, `Czech` a `Hungarian` a vlož príslušné texty zo súboru `CHROME_WEB_STORE_LISTING.md`. Názov zostáva vo všetkých jazykoch rovnaký.

Súhrn do 132 znakov sa načítava z lokalizovaného `manifest.json`. Neupravuj ho na tvrdenie typu „najlepšie“ alebo „oficiálne“.

## 4. Privacy practices

### Single purpose

Vlož:

> Lets users hide and manage unwanted offers, products, and sellers on supported Allegro marketplaces.

### Permission justification: storage

Vlož:

> Stores the user's hiding rules, extension on/off state, selected interface language, and compatibility status locally in chrome.storage.local so the choices persist across page reloads. The stored data is not transmitted externally.

### Host/site access justification

Ak Dashboard zobrazí odôvodnenie prístupu k hostiteľom, vlož:

> The content script runs only on allegro.sk, allegro.pl, allegro.cz, and allegro.hu. It reads offer links, visible titles, and available seller names to identify result cards and inject the user-requested hide controls. No page content or URL is sent to the developer or a third party.

### Remote code

Vyber `No, I am not using remote code`.

Ak Dashboard napriek voľbe `No` vyžaduje text v poli `Justification`, vlož:

> No remote code is used. All JavaScript, CSS, and localization files executed by the extension are included in the submitted ZIP package. The only fetch call reads a bundled locale JSON file through chrome.runtime.getURL; the extension does not load or execute external JavaScript, WebAssembly, modules, or eval-based code.

### Data disclosure

Rozšírenie nič neposiela mimo zariadenia, ale Chrome považuje aj lokálne spracovanie za prácu s používateľskými údajmi. V zobrazenom formulári označ presne:

- `Web history` — áno. Rozšírenie lokálne pracuje s odkazmi a trhom Allegro na aktuálnej navštívenej stránke, aby rozpoznalo ponuky. Nežiada oprávnenie `history`, nečíta Chrome History API ani neukladá zoznam navštívených stránok.
- `Website content` — áno. Lokálne číta odkazy na ponuky, ich viditeľné názvy a dostupné mená predajcov iba na podporovaných stránkach Allegro.
- všetky ostatné kategórie — nie: personally identifiable information, health information, financial and payment information, authentication information, personal communications, location a user activity. Rozšírenie neprofiluje kliknutia, pohyb myšou, rolovanie ani stlačenia kláves; uloží iba pravidlo, ktoré používateľ vedome vytvorí voľbou skrytia.

### Limited Use certifications

Potvrď všetky pravdivé certifikácie:

- údaje sa nepredávajú tretím stranám;
- nepoužívajú sa na účely nesúvisiace s jediným účelom rozšírenia;
- nepoužívajú sa na určovanie úverovej bonity ani poskytovanie pôžičiek;
- nepoužívajú sa na personalizovanú reklamu;
- ľudia údaje nečítajú, pretože sa vývojárovi neposielajú.

### Privacy policy

Vlož verejne dostupnú URL:

`https://github.com/RealPatrik/offer-hider-for-allegro/blob/main/PRIVACY.md`

Táto URL bude fungovať až po zverejnení repozitára `RealPatrik/offer-hider-for-allegro`, ktorý je v čase prípravy súkromný. Ak má zostať súkromný, najprv zverejni rovnaký obsah `PRIVACY.md` na inom verejnom webe a vlož jeho URL. Pred odoslaním odkaz otvor v anonymnom okne a over, že je dostupný bez prihlásenia.

## 5. Distribution

1. Pricing: `Free`.
2. Visibility: `Public`.
3. Geographic distribution: vyber `Slovakia`, `Poland`, `Czechia` a `Hungary`.
4. Nevyberaj všetky regióny, kým rozšírenie nepodporuje ďalšie Allegro trhy alebo jazyky.
5. Ak Dashboard ponúka trusted testers, pre verejné vydanie ich netreba vypĺňať.

## 6. Test instructions

Prihlasovacie údaje nie sú potrebné. Do poľa s pokynmi pre kontrolóra vlož:

> No account or test credentials are required. Open https://allegro.sk/vyhladavanie?string=sluchadla and wait for the search-result cards to load. Each recognized regular and sponsored offer card receives an eye-slash button next to the add-to-cart control. Click the button to hide the offer and use the undo notification to restore it. Click the extension toolbar icon to manage hidden items and to temporarily reveal matching hidden offers on the current page. Reload the Allegro tab to verify that the locally stored hiding rule persists. The extension also supports allegro.pl, allegro.cz, and allegro.hu.

Do doplňujúcej poznámky môžeš vložiť:

> All extension logic is included in the submitted package. The extension has no backend, does not load remote code, does not use analytics, and stores user choices only in chrome.storage.local.

## 7. Pred odoslaním na kontrolu

1. Nainštaluj rozbalený priečinok `dist` v stabilnej verzii Chrome.
2. Otestuj minimálne jednu normálnu a jednu sponzorovanú ponuku na každej podporovanej doméne.
3. Otestuj skrytie, obnovenie, dočasné zobrazenie, prepínač zapnutia, vyhľadávanie v popupe, import a export.
4. Reštartuj Chrome a over, že pravidlá zostali uložené.
5. Skontroluj popup s klávesnicou: Tab, Shift+Tab, Enter, Space a viditeľný focus.
6. Otvor privacy policy, homepage a support URL v anonymnom okne.
7. Skontroluj, že screenshoty zobrazujú aktuálnu verziu a neobsahujú súkromné údaje používateľa.
8. Skontroluj názov, opis a deklarácie súkromia. Musia sa zhodovať so správaním rozšírenia.

## 8. Odoslanie

1. Klikni `Submit for review`.
2. Pre prvé vydanie odporúčanie: ponechaj automatické publikovanie po schválení, ak chceš ísť online hneď. Ak chceš ešte skontrolovať výslednú stránku pred spustením, zapni deferred publishing.
3. Potvrď odoslanie.
4. Sleduj stav `Pending`, `Published` alebo `Rejected` v Dashboarde a v kontaktnom e-maile.
5. Pri deferred publishing musíš schválenú položku manuálne publikovať v lehote, ktorú zobrazuje Dashboard; oficiálna dokumentácia uvádza maximálne 30 dní.

## Hodnoty, ktoré musí doplniť vlastník účtu

- Google účet vlastníka rozšírenia.
- Kontaktný e-mail vývojára.
- Verejný publisher name, ak nemá byť `RealPatrik`.
- Pravdivé rozhodnutie `Trader` alebo `Non-trader`.
- Pri Trader účte právne meno/názov, adresa, verejný e-mail, telefón a prípadné doklady.
- Platobné údaje na jednorazový registračný poplatok.
