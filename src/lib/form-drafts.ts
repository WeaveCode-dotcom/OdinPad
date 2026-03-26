const PREFIX = "odinpad_draft_";

export type FormDraftPayload = Record<string, string>;

export function draftKey(userId: string | undefined, formId: string): string {
  const u = userId ?? "anon";
  return `${PREFIX}${u}_${formId}`;
}

export function saveDraft(userId: string | undefined, formId: string, data: FormDraftPayload): void {
  try {
    localStorage.setItem(draftKey(userId, formId), JSON.stringify({ savedAt: Date.now(), data }));
  } catch {
    /* quota / private mode */
  }
}

export function loadDraft(
  userId: string | undefined,
  formId: string,
): { savedAt: number; data: FormDraftPayload } | null {
  try {
    const raw = localStorage.getItem(draftKey(userId, formId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { savedAt?: number; data?: FormDraftPayload };
    if (!parsed.data || typeof parsed.savedAt !== "number") return null;
    return { savedAt: parsed.savedAt, data: parsed.data };
  } catch {
    return null;
  }
}

export function clearDraft(userId: string | undefined, formId: string): void {
  try {
    localStorage.removeItem(draftKey(userId, formId));
  } catch {
    /* ignore */
  }
}
