/**
 * A page that enforces `Content-Security-Policy: require-trusted-types-for
 * 'script'` (increasingly common on large e-commerce sites) makes every
 * `Element.innerHTML =` assignment throw — including from a content script,
 * since the restriction is on the DOM sink itself, not the calling JS world.
 * Declaring our own Trusted Types policy only works if the page's CSP also
 * lists our policy name in its `trusted-types` directive, which we can't
 * control or detect in advance.
 *
 * `DOMParser.parseFromString()` is not a gated sink (it produces a detached
 * Document; nothing in it executes), so we parse markup there and move the
 * resulting nodes over with plain DOM APIs — which always work regardless of
 * the page's Trusted Types configuration.
 */

function htmlToNodes(html: string): Node[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.childNodes);
}

export function replaceContent(root: Element | ShadowRoot, html: string): void {
  root.replaceChildren(...htmlToNodes(html));
}

export function appendHtml(root: Element | ShadowRoot, html: string): void {
  root.append(...htmlToNodes(html));
}

export function createStyle(css: string): HTMLStyleElement {
  const style = document.createElement("style");
  style.textContent = css;
  return style;
}
