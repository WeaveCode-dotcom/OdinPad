import DOMPurify from "dompurify";

/** Strips HTML; use for any user- or model-supplied string shown in the UI (defense in depth; React also escapes text nodes). */
export function sanitizeUserFacingPlainText(input: string): string {
  return DOMPurify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}
