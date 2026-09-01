import type { Identity, Market, SellerIdentity } from "./types";

const OFFER_ID_PATTERN = /-(\d{6,})(?:[/?#]|$)/;
const PRODUCT_UUID_PATTERN =
  /\/produkt\/[^/?#]*-([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
const OFFER_PATH_PATTERN = /\/(?:oferta|ponuka|offer|item)\//i;
const REDIRECT_PATH_PATTERN = /\/events\/clicks/i;

const EMPTY_IDENTITY: Identity = { offerId: null, productUuid: null, market: null };

export function marketFromHostname(hostname: string): Market | null {
  const match = hostname.match(/allegro\.(sk|pl|cz|hu)$/i);
  return match ? (match[1]!.toLowerCase() as Market) : null;
}

function offerIdFromPath(pathname: string): string | null {
  if (!OFFER_PATH_PATTERN.test(pathname)) return null;
  const match = pathname.match(OFFER_ID_PATTERN);
  return match ? match[1]! : null;
}

function offerIdFromQuery(search: string): string | null {
  const params = new URLSearchParams(search);
  const offerId = params.get("offerId");
  return offerId && /^\d{4,}$/.test(offerId) ? offerId : null;
}

function productUuidFromPath(pathname: string): string | null {
  const match = pathname.match(PRODUCT_UUID_PATTERN);
  return match ? match[1]!.toLowerCase() : null;
}

export function identityFromUrl(href: string, depth = 0): Identity {
  if (depth > 2) return EMPTY_IDENTITY;

  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return EMPTY_IDENTITY;
  }

  const market = marketFromHostname(url.hostname);

  if (REDIRECT_PATH_PATTERN.test(url.pathname)) {
    const redirect = url.searchParams.get("redirect");
    if (redirect) {
      const nested = identityFromUrl(redirect, depth + 1);
      if (nested.offerId || nested.productUuid) {
        return { ...nested, market: nested.market ?? market };
      }
    }
    return { ...EMPTY_IDENTITY, market };
  }

  const productUuid = productUuidFromPath(url.pathname);
  const offerId = offerIdFromQuery(url.search) ?? offerIdFromPath(url.pathname);

  if (!market && !offerId && !productUuid) return EMPTY_IDENTITY;
  return { offerId, productUuid, market };
}

export function identityFromCard(article: Element): Identity | null {
  const links = article.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href) continue;
    const identity = identityFromUrl(href);
    if (identity.offerId || identity.productUuid) return identity;
  }
  return null;
}

export function hideKeys(identity: Identity): string[] {
  const keys: string[] = [];
  if (identity.offerId) keys.push(`offer:${identity.offerId}`);
  if (identity.productUuid) keys.push(`product:${identity.productUuid}`);
  return keys;
}

export const SELLER_BOX_SELECTOR = '[data-box-name="Seller summary container"]';
const SELLER_LINK_PATH = /^\/([a-z0-9_-]+)\/([a-z0-9_.-]+)\/?$/i;
const SELLER_LINK_EXCLUDE = /^(oferta|ponuka|offer|item|produkt|events|listing|vyhladavanie)$/i;

/**
 * Scans anchors inside `root` for a two-segment profile-style path
 * (`/pouzivatel/<name>`, `/uzytkownik/<name>`, ...). `root` is the seller
 * summary box on an offer page, or a listing card when a market ever
 * starts linking the seller from search results.
 */
export function sellerFromElement(root: ParentNode, market: Market | null): SellerIdentity | null {
  const links = root.querySelectorAll<HTMLAnchorElement>("a[href]");
  for (const link of links) {
    const href = link.getAttribute("href");
    if (!href || href.startsWith("#")) continue;

    let pathname: string;
    try {
      pathname = new URL(href, document.baseURI).pathname;
    } catch {
      continue;
    }

    const match = pathname.match(SELLER_LINK_PATH);
    if (!match) continue;
    const [, segment, username] = match;
    if (SELLER_LINK_EXCLUDE.test(segment!)) continue;

    const marketPrefix = market ?? "unknown";
    return { key: `seller:${marketPrefix}/${username}`, name: username! };
  }

  return null;
}
