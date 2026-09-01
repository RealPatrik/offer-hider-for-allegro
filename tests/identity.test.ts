import { describe, expect, it } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  hideKeys,
  identityFromCard,
  identityFromUrl,
  marketFromHostname,
  sellerFromElement,
} from "../src/core/identity";

function fixture(name: string): string {
  return readFileSync(join(process.cwd(), "tests/fixtures", name), "utf8");
}

function articleFromFixture(name: string, url: string): Element {
  const dom = new JSDOM(fixture(name), { url });
  const article = dom.window.document.querySelector("article");
  if (!article) throw new Error(`no <article> in fixture ${name}`);
  return article;
}

describe("marketFromHostname", () => {
  it("recognises all four Allegro markets, including subdomains", () => {
    expect(marketFromHostname("allegro.sk")).toBe("sk");
    expect(marketFromHostname("business.allegro.pl")).toBe("pl");
    expect(marketFromHostname("www.allegro.cz")).toBe("cz");
    expect(marketFromHostname("allegro.hu")).toBe("hu");
  });

  it("returns null for unrelated hosts", () => {
    expect(marketFromHostname("allegro.de")).toBeNull();
    expect(marketFromHostname("allegrolokalnie.pl")).toBeNull();
  });
});

describe("identityFromUrl", () => {
  it("reads the offer id from ?offerId= on a /produkt/ URL and the product uuid from the slug", () => {
    const id = identityFromUrl(
      "https://allegro.sk/produkt/celotvarova-lakovacia-maska-typu-3m-6800-plynova-chemicka-filtre-x20-61eee19b-5872-4de1-8ccd-f525b910eedf?offerId=18854735928",
    );
    expect(id.offerId).toBe("18854735928");
    expect(id.productUuid).toBe("61eee19b-5872-4de1-8ccd-f525b910eedf");
    expect(id.market).toBe("sk");
  });

  it("reads the offer id from a direct /ponuka/ URL", () => {
    const id = identityFromUrl(
      "https://allegro.sk/ponuka/celotvarova-plynova-maska-s-filtrom-na-ochranu-pred-chemikaliami-18464697700",
    );
    expect(id.offerId).toBe("18464697700");
    expect(id.productUuid).toBeNull();
  });

  it("follows a sponsored /events/clicks redirect to the underlying offer", () => {
    const id = identityFromUrl(
      "https://allegro.sk/events/clicks?emission_unit_id=4db88c1d-7550-411d-b5f2-87d4c998769f&type=OFFER&redirect=" +
        encodeURIComponent(
          "https://allegro.sk/ponuka/celotvarova-plynova-maska-s-filtrom-na-ochranu-pred-chemikaliami-18464697700?bi_s=ads",
        ),
    );
    expect(id.offerId).toBe("18464697700");
    expect(id.market).toBe("sk");
  });

  it("returns nulls for an unrelated URL", () => {
    const id = identityFromUrl("https://allegro.sk/kategoria/dom-i-ogrod");
    expect(id.offerId).toBeNull();
    expect(id.productUuid).toBeNull();
  });

  it("does not throw on a malformed URL", () => {
    expect(() => identityFromUrl("not a url")).not.toThrow();
    expect(identityFromUrl("not a url").offerId).toBeNull();
  });
});

describe("identityFromCard", () => {
  it("extracts offer + product identity from a normal SK listing card", () => {
    const article = articleFromFixture("sk-listing-card-normal.html", "https://allegro.sk/vyhladavanie");
    const identity = identityFromCard(article);
    expect(identity?.offerId).toBe("18854735928");
    expect(identity?.productUuid).toBe("61eee19b-5872-4de1-8ccd-f525b910eedf");
    expect(hideKeys(identity!)).toEqual([
      "offer:18854735928",
      "product:61eee19b-5872-4de1-8ccd-f525b910eedf",
    ]);
  });

  it("extracts offer identity from a sponsored SK listing card via the redirect link", () => {
    const article = articleFromFixture("sk-listing-card-sponsored.html", "https://allegro.sk/vyhladavanie");
    const identity = identityFromCard(article);
    expect(identity?.offerId).toBe("18464697700");
    expect(hideKeys(identity!)).toEqual(["offer:18464697700"]);
  });

  it("extracts offer + product identity from a normal PL listing card", () => {
    const article = articleFromFixture("pl-listing-card-normal.html", "https://allegro.pl/listing");
    const identity = identityFromCard(article);
    expect(identity?.offerId).toBe("18860476603");
    expect(identity?.productUuid).toBe("de7dba05-6e5f-411f-a24d-a0992a32d234");
  });
});

describe("sellerFromElement", () => {
  it("reads the seller from the SK offer page's seller box (/pouzivatel/<name>)", () => {
    const dom = new JSDOM(fixture("sk-offer-page-seller-box.html"), { url: "https://allegro.sk/ponuka/x" });
    const seller = sellerFromElement(dom.window.document, "sk");
    expect(seller).toEqual({ key: "seller:sk/ZaZarcie", name: "ZaZarcie" });
  });

  it("reads the seller from the PL offer page's seller box (/uzytkownik/<name>)", () => {
    const dom = new JSDOM(fixture("pl-offer-page-seller-box.html"), { url: "https://allegro.pl/oferta/x" });
    const seller = sellerFromElement(dom.window.document, "pl");
    expect(seller).toEqual({ key: "seller:pl/JYITech_mall", name: "JYITech_mall" });
  });

  it("returns null when there is no seller link in the given root (real listing cards today)", () => {
    const article = articleFromFixture("sk-listing-card-normal.html", "https://allegro.sk/vyhladavanie");
    expect(sellerFromElement(article, "sk")).toBeNull();
  });
});
