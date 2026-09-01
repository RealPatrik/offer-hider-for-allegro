# Offer Hider for Allegro — návrh (design spec)

Dátum: 2026-09-01
Stav: na schválenie

## 1. Cieľ

Rozšírenie pre Chrome (Manifest V3), ktoré používateľovi umožní **natrvalo skryť konkrétnu ponuku** vo výsledkoch vyhľadávania a vo výpisoch na Allegro. Cieľom je čistý výsledok vyhľadávania bez opakovane sa vracajúcich ponúk, ktoré používateľa nezaujímajú. Rozšírenie je od začiatku pripravované na zverejnenie v Chrome Web Store.

Názov v Store: **Offer Hider for Allegro** (finálne znenie sa môže upraviť; značka „Allegro“ je v názve použitá popisne v tvare „for Allegro“).

## 2. Rozsah

### V rozsahu v1
- Trhy: `allegro.sk`, `allegro.pl`, `allegro.cz`, `allegro.hu` vrátane subdomén (`business.allegro.pl` atď.).
- Typy stránok: výsledky vyhľadávania, kategórie a výpisy predajcu, bloky „odporúčané / podobné ponuky“ na detaile ponuky, samotný detail ponuky.
- Skrývanie: konkrétna ponuka (offer), konkrétny produkt (product), predajca **tam, kde je jeho meno prítomné v DOM**.
- Panel rozšírenia: zoznam skrytých s obnovením, rýchly vypínač skrývania, export/import JSON, prepínač jazyka.
- Jazyky UI: angličtina (default), poľština, slovenčina, maďarčina, čeština.
- Úložisko: `chrome.storage.local` + manuálny export/import.

### Mimo rozsahu v1
- Skrývanie podľa kľúčových slov alebo cenových pravidiel.
- Automatická synchronizácia medzi zariadeniami cez účet Google.
- Akékoľvek sieťové volania na cudzie servery, telemetria, analytika.
- Doťahovanie mena predajcu na pozadí extra požiadavkami na Allegro.

## 3. Overené zistenia o štruktúre stránky

Overené 2026-09-01 na `https://allegro.sk/vyhladavanie?string=plynová maska` (74 kariet, z toho 12 sponzorovaných):

1. Karta ponuky je element `<article>`.
2. CSS triedy sú generované a nestabilné (`mx7m_1 mnyp_co mlkp_ag …`) — **nesmú sa použiť ako selektory**.
3. Kontajner výpisu má čitateľný atribút `data-box-name="product listing items"`; ďalšie prítomné boxy: `listing`, `Items Container`.
4. Cesty v URL sú lokalizované podľa trhu: PL `/listing` a `/oferta/`, SK `/vyhladavanie` a `/ponuka/`. Detekcia typu stránky preto **nesmie stáť na názve cesty**.
5. Odkaz na ponuku má tri tvary:
   - produktová karta: `https://allegro.sk/produkt/<slug>-<uuid>?offerId=188547359`
   - priama ponuka: `https://allegro.sk/ponuka/<slug>-18875692290` (PL `/oferta/`)
   - sponzorovaná karta: `https://allegro.sk/events/clicks?…&type=OFFER&redirect=<url-encoded odkaz na ponuku>`
6. Tlačidlo do košíka nesie stabilný atribút `data-role-type="add-to-cart-button"` — použiteľné ako kotva pre umiestnenie našej ikony.
7. **Meno predajcu na slovenskom výpise v DOM nie je** — karta obsahuje len odznak „Super predajca“. Na iných trhoch a na detaile ponuky predajca prítomný je.

Tieto zistenia sú viazané na konkrétny dátum. Implementácia ich musí overovať za behu (bod 10) a nesmie na nich staticky závisieť.

## 4. Architektúra

Manifest V3. Tri behové kontexty nad spoločným jadrom:

```
src/
  core/            # bez DOM a bez závislosti na Chrome API mimo storage
    identity.ts    # extrakcia identity ponuky z URL / karty
    store.ts       # repozitár skrytých položiek
    settings.ts    # nastavenia (zapnutie, jazyk)
    i18n.ts        # preklady s možnosťou manuálneho prepnutia
    types.ts
  content/         # beží na stránkach allegro.*
    index.ts       # bootstrap, prepojenie modulov
    scanner.ts     # nájdenie kariet, MutationObserver, dávkovanie
    card-ui.ts     # vloženie ovládacej ikony do karty (Shadow DOM)
    undo.ts        # lišta „Skryté — Vrátiť späť“
    offer-page.ts  # správanie na detaile ponuky
    early-style.ts # štýl vložený pri document_start
  popup/
    index.html, popup.ts, popup.css
_locales/{en,pl,sk,hu,cs}/messages.json
public/icons/{16,32,48,128}.png
tests/fixtures/*.html
store-assets/
```

**Bez service workera.** Synchronizácia medzi otvorenými kartami sa rieši cez `chrome.storage.onChanged`, ktorý sa spustí vo všetkých kontextoch vrátane content scriptov. Service worker by nepridal nič a zväčšil by plochu na posudzovanie v Store.

### Rozhrania modulov

`core/identity.ts`
```ts
type Identity = {
  offerId: string | null;      // "18875692290"
  productUuid: string | null;  // "61eee19b-5872-4de1-8ccd-f525b910eedf"
  market: Market;              // "sk" | "pl" | "cz" | "hu"
};
function identityFromUrl(href: string): Identity;
function identityFromCard(article: Element): Identity | null;
function hideKeys(id: Identity): string[]; // ["offer:1887…", "product:61ee…"]
```

`core/store.ts` — jediný prístup k `chrome.storage`. Drží `Set` kľúčov v pamäti, zápis je debouncovaný (250 ms).
```ts
isHidden(keys: string[]): boolean;
hide(entry: HiddenEntry): Promise<void>;
unhide(key: string): Promise<void>;
list(filter?: string): HiddenEntry[];
exportJson(): string;
importJson(text: string, mode: "merge" | "replace"): Promise<ImportResult>;
onChange(cb: () => void): () => void;
```

## 5. Dátový model

```json
{
  "schemaVersion": 1,
  "hidden": {
    "offer:18875692290": { "t": 1788275860, "n": "Ochranná maska…", "m": "sk", "k": "offer" },
    "product:61eee19b-…": { "t": 1788275999, "n": "Celotvárová maska…", "m": "sk", "k": "product" },
    "seller:pl/nazov_predajcu": { "t": 1788276100, "n": "nazov_predajcu", "m": "pl", "k": "seller" }
  },
  "settings": { "enabled": true, "locale": null }
}
```

Jedna položka má približne 80 bajtov, 10 000 skrytých ponúk teda zaberie okolo 800 kB — hlboko pod 10 MB limitom `chrome.storage.local`, povolenie `unlimitedStorage` nie je potrebné.

`schemaVersion` umožní migráciu pri neskoršej zmene štruktúry. Import cudzieho súboru s vyššou verziou sa odmietne s hlásením.

Kľúč predajcu obsahuje trh (`seller:pl/login`), pretože rovnaký login na rôznych trhoch nemusí byť tá istá osoba.

## 6. Identita ponuky

Jedna čistá funkcia, ktorá pokrýva všetky tri tvary odkazu zistené v bode 3:

1. Ak URL obsahuje `?offerId=<číslice>` → `offer:<číslice>`.
2. Ak cesta zodpovedá `/(oferta|ponuka|offer|item)/<slug>-<číslice>` → `offer:<číslice>`.
3. Ak cesta je `/events/clicks` → dekódovať parameter `redirect` a spracovať výsledok pravidlami 1 a 2.
4. Ak cesta je `/produkt/<slug>-<uuid>` → navyše `product:<uuid>`.

Karta sa skryje, ak je v úložisku ktorýkoľvek z jej kľúčov. Ak sa z karty nedá získať žiadny kľúč, karta sa ignoruje a ovládacia ikona sa do nej nevloží — nikdy sa neskrýva „naslepo“ podľa pozície alebo textu.

Tento modul nezávisí od DOM ani od Chrome API a testuje sa nad reťazcami.

## 7. Skenovanie a životný cyklus DOM

- Content script beží pri `document_start` a okamžite vloží štýl `article[data-aoh="hidden"]{display:none!important}`. Bez toho by skrytá karta na okamih preblikla a mriežka by poskočila.
- Zoznam skrytých sa načíta raz do pamäte; ďalšie porovnania sú synchrónne.
- Karty sa hľadajú v kontajneri `[data-box-name="product listing items"]`, s fallbackom na celý dokument, ak sa kontajner nenájde. Hľadá sa `article`.
- `MutationObserver` na kontajneri pokrýva prekreslenie pri filtrovaní, stránkovaní aj donačítaní obsahu. Spracovanie je dávkované cez `requestAnimationFrame`, aby sa pri veľkých zmenách neblokovalo vykresľovanie.
- Každá spracovaná karta dostane značku `data-aoh-seen`, aby sa nespracovala dvakrát. Stav skrytia nesie samostatný atribút `data-aoh="hidden"`, takže sa obe značky nevylučujú.
- Vkladané UI žije v Shadow DOM, takže CSS Allegra ho neovplyvní a naše štýly neovplyvnia stránku.

## 8. Používateľské rozhranie

### Karta ponuky
- Ikona preškrtnutého oka v rohu karty, kotvená k okoliu tlačidla `data-role-type="add-to-cart-button"`; ak kotva chýba, umiestni sa do pravého horného rohu karty.
- Na desktope sa ikona zobrazí pri prejdení myšou nad kartou; pri dotykovom ovládaní je zobrazená trvalo. Ikona má `aria-label` a je dosiahnuteľná klávesnicou.
- Klik na ikonu skryje ponuku okamžite.
- Malá šípka vedľa ikony otvára menu: *Skryť túto ponuku* / *Skryť tento produkt* / *Skryť tohto predajcu*. Posledná položka sa zobrazí len vtedy, keď sa meno predajcu podarí prečítať z karty.

### Vrátenie späť
Po skrytí sa v dolnej časti okna zobrazí lišta „Skryté — Vrátiť späť“ na 5 sekúnd. Opakované skrytia sa v lište zlučujú do jednej správy s počtom. Lišta je v Shadow DOM, s `role="status"`.

### Detail ponuky
Ak je otvorená ponuka skrytá, hore sa zobrazí pruh „Túto ponuku máš skrytú“ s tlačidlom na odkrytie. Ak skrytá nie je, v pruhu je tlačidlo na skrytie. Stránka sa nikdy neskryje celá.

### Panel rozšírenia
- Zoznam skrytých položiek (názov, typ, trh, dátum) s vyhľadávaním a tlačidlom obnovenia pri každej položke.
- Prepínač „Skrývanie zapnuté / vypnuté“ — dočasne zobrazí všetko bez mazania zoznamu.
- Export JSON (stiahnutie súboru) a import JSON s voľbou zlúčiť alebo nahradiť.
- Prepínač jazyka UI (Automaticky / English / Polski / Slovenčina / Magyar / Čeština).
- Ak scanner ohlási zlyhanie rozpoznávania (bod 10), panel zobrazí upozornenie.

## 9. Blokovanie predajcov

Funkcia je zámerne podmienená dostupnosťou údaja: **ak meno predajcu nie je v DOM karty, možnosť „Skryť predajcu“ sa nezobrazí**. Kde v DOM je (detail ponuky, výpisy na trhoch, ktoré predajcu zobrazujú), možnosť sa objaví a funguje.

Rozšírenie si na zistenie predajcu nikdy nevyžiada žiadnu ďalšiu stránku ani API volanie.

Meno predajcu sa hľadá v poradí: odkaz na profil predajcu v karte (`/uzytkownik/`, `/uzivatel/`, `/user/`), potom textový vzor „od <meno>“ podľa trhu. Odznaky ako „Super predajca“ sa za meno nepovažujú.

## 10. Odolnosť a degradácia

- Žiadny selektor sa neopiera o generované CSS triedy.
- Ak scanner spracuje kontajner výpisu a nenájde v ňom ani jednu kartu s rozpoznateľnou identitou, prepne sa do stavu „nekompatibilné“: prestane zasahovať do stránky a nastaví príznak v úložisku, ktorý panel zobrazí ako „Allegro zmenilo štruktúru stránky, potrebná aktualizácia rozšírenia“.
- Chyba v ktorejkoľvek časti content scriptu nesmie zhodiť stránku: bootstrap aj spracovanie karty sú v `try/catch`, pri chybe sa modul ticho vypne.
- Ochrana Allegra proti botom sa rozšírenia netýka, pretože content script beží v kontexte už načítanej stránky používateľa.

## 11. Viacjazyčnosť

- `_locales/{en,pl,sk,hu,cs}/messages.json`, `default_locale: "en"`. Tieto súbory obsahujú aj názov a popis rozšírenia, takže Store zobrazí lokalizované údaje.
- `chrome.i18n` sa riadi jazykom prehliadača a nedá sa prepnúť za behu. Preto `core/i18n.ts` implementuje `t(key)`: ak používateľ zvolil jazyk, načíta príslušný `messages.json` cez `fetch(chrome.runtime.getURL(...))` a preloží z neho; inak použije `chrome.i18n.getMessage`. Súbory teda slúžia obom mechanizmom.
- Preklady sa v testoch kontrolujú na úplnosť: každý jazyk musí mať rovnakú množinu kľúčov ako `en`.

## 12. Pripravenosť na Chrome Web Store

- **Povolenia: iba `storage`.** Žiadne `tabs`, `activeTab`, `scripting` ani `host_permissions`. Prístup na stránky je daný `content_scripts.matches`:
  `*://*.allegro.sk/*`, `*://*.allegro.pl/*`, `*://*.allegro.cz/*`, `*://*.allegro.hu/*` (vzor so `*.` pokrýva aj holú doménu aj `business.*`).
- **Jediný účel** je formulovateľný jednou vetou: skrývanie ponúk na Allegro na žiadosť používateľa.
- **Žiadny zber údajov.** V Data Safety formulári sa deklaruje nula kategórií. Žiadny externý kód: build musí byť plne lokálny, bez CDN, bez `eval` a bez `new Function`.
- Balíček obsahuje ikony 16/32/48/128, minimálne jeden screenshot 1280×800, promo dlaždicu 440×280, lokalizovaný názov a popis, odkaz na zásady ochrany súkromia a semver verziu. Do ZIP sa nebalia zdrojové mapy ani vývojové súbory.
- Riziko pri posudzovaní: cudzia značka v názve. Popis musí jasne uvádzať, že rozšírenie nie je oficiálny produkt Allegro.

## 13. Technológie a build

- TypeScript + Vite. Vstupy: `content` a `popup`.
- Content script sa builduje ako **IIFE bez rozdeľovania kódu** — klasické content scripty nepodporujú ES moduly.
- `manifest.json`, `_locales/` a ikony sa kopírujú do `dist/` ako statické súbory.
- Skripty: `dev` (build v režime watch pre „Load unpacked“), `build`, `test`, `zip` (balíček pre Store).

## 14. Testovanie

- **Unit (Vitest):** `core/identity.ts` nad všetkými tromi tvarmi URL vrátane sponzorovaného presmerovania a chybných vstupov; `core/store.ts` nad falošným `chrome.storage`; úplnosť prekladov.
- **DOM (Vitest + jsdom):** scanner nad uloženými HTML snapshotmi reálnych stránok v `tests/fixtures/` (SK výpis, PL výpis, detail ponuky, sponzorovaná karta). Snapshoty sa uložia pri implementácii a slúžia ako regresná ochrana proti zmenám v našom kóde.
- **Manuálny smoke checklist** pred každým vydaním: na každom trhu skryť ponuku, obnoviť ju, prefiltrovať výsledky, prejsť na ďalšiu stranu, overiť panel a prepnutie jazyka.

## 15. Etapy

| Etapa | Obsah | Hotovo znamená |
|---|---|---|
| M0 | Kostra projektu, manifest, build, načítanie cez „Load unpacked“ | Rozšírenie sa načíta a beží prázdne bez chýb |
| M1 | `identity`, `store`, skrývanie kariet na výpise | Skrytá ponuka zostane skrytá po obnovení stránky |
| M2 | Ikona v karte, undo lišta, MutationObserver, detail ponuky a odporúčané bloky | Skrývanie funguje na všetkých cieľových typoch stránok |
| M3 | Panel: zoznam, obnovenie, vypínač, export/import | Zoznam sa dá spravovať a preniesť medzi zariadeniami |
| M4 | 5 jazykov, prepínač jazyka, test úplnosti prekladov | UI je kompletne preložené |
| M5 | Ikony, screenshoty, popisy, zásady súkromia, ZIP | Balíček je odosielateľný do Store |

## 16. Otvorené otázky

Žiadne blokujúce. Finálne znenie názvu a text zásad ochrany súkromia sa doplnia v etape M5.
