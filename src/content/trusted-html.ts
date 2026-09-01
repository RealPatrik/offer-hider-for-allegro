/**
 * A page that enforces `Content-Security-Policy: require-trusted-types-for 'script'`
 * (increasingly common on large e-commerce sites) makes every `.innerHTML =`
 * assignment throw — including from a content script, since Trusted Types is
 * enforced on the DOM sink itself, not per JS world. Every HTML string we ever
 * assign here is either a static template or built with escapeHtml(), so it's
 * safe to declare a permissive policy for our own use rather than hand-build
 * DOM nodes everywhere.
 */

interface TrustedHTML {
  __trustedHTMLBrand: true;
}

interface TrustedTypePolicy {
  createHTML(input: string): TrustedHTML;
}

interface TrustedTypePolicyFactory {
  createPolicy(name: string, rules: { createHTML(input: string): string }): TrustedTypePolicy;
}

let policy: TrustedTypePolicy | null | undefined;

function getPolicy(): TrustedTypePolicy | null {
  if (policy !== undefined) return policy;

  const factory = (window as unknown as { trustedTypes?: TrustedTypePolicyFactory }).trustedTypes;
  if (!factory) {
    policy = null;
    return policy;
  }

  try {
    policy = factory.createPolicy("offer-hider-for-allegro", { createHTML: (input) => input });
  } catch {
    // A policy with this name may already exist, or CSP's trusted-types
    // directive may not list it — fall back to a plain string assignment.
    policy = null;
  }
  return policy;
}

export function setInnerHtml(el: Element | ShadowRoot, html: string): void {
  const target = el as unknown as { innerHTML: string | TrustedHTML };
  const p = getPolicy();
  target.innerHTML = p ? p.createHTML(html) : html;
}
