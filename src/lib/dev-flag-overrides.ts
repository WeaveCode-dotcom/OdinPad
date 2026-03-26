/**
 * Dev-only runtime overrides for feature flags.
 * Stored in localStorage so they survive page reloads.
 * Only active when import.meta.env.DEV is true.
 */

const STORAGE_KEY = "__odinpad_dev_flags__";
export const DEV_FLAG_CHANGE_EVENT = "devflag:change";

export function getDevOverrides(): Record<string, boolean> {
  if (!import.meta.env.DEV) return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, boolean>;
  } catch {
    return {};
  }
}

export function setDevOverride(key: string, value: boolean): void {
  if (!import.meta.env.DEV) return;
  const current = getDevOverrides();
  current[key] = value;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent(DEV_FLAG_CHANGE_EVENT));
}

export function clearAllDevOverrides(): void {
  if (!import.meta.env.DEV) return;
  localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(DEV_FLAG_CHANGE_EVENT));
}
