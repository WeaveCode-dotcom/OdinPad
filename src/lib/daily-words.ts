const PREFIX = 'odinpad_words_today_';

export function getTodayKey(): string {
  return `${PREFIX}${new Date().toISOString().slice(0, 10)}`;
}

export function getWordsToday(): number {
  try {
    return Number(localStorage.getItem(getTodayKey()) || '0');
  } catch {
    return 0;
  }
}

export function addWordsToday(delta: number): void {
  try {
    const k = getTodayKey();
    const next = Math.max(0, getWordsToday() + delta);
    localStorage.setItem(k, String(next));
  } catch {
    // no-op
  }
}
