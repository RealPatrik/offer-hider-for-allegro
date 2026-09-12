/**
 * Lightweight, JSON-serialisable contract between the popup and the content
 * script in the active Allegro tab. This is deliberately page-local: it must
 * never be stored alongside the user's durable hidden-items list.
 */
export type PageStatusMessage =
  | { type: "aoh:get-page-status" }
  | { type: "aoh:set-temporary-reveal"; enabled: boolean };

export interface PageHideStatus {
  /** Cards on this page that match at least one persisted hiding rule. */
  matchedCount: number;
  /** Whether those matching cards are currently shown just for this page. */
  temporarilyRevealed: boolean;
  /** Global hiding remains an independent, persisted setting. */
  hidingEnabled: boolean;
}

export function isPageStatusMessage(value: unknown): value is PageStatusMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  if (message.type === "aoh:get-page-status") return true;
  return message.type === "aoh:set-temporary-reveal" && typeof message.enabled === "boolean";
}

export function isPageHideStatus(value: unknown): value is PageHideStatus {
  if (!value || typeof value !== "object") return false;
  const status = value as Record<string, unknown>;
  return (
    typeof status.matchedCount === "number" &&
    Number.isFinite(status.matchedCount) &&
    status.matchedCount >= 0 &&
    typeof status.temporarilyRevealed === "boolean" &&
    typeof status.hidingEnabled === "boolean"
  );
}
