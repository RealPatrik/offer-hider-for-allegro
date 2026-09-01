export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function cardTitle(article: Element): string {
  const heading = article.querySelector("h1, h2");
  return heading?.textContent?.trim() || "";
}
