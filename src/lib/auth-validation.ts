export const MIN_PASSWORD_LENGTH = 8;
export const COOLDOWN_SECONDS = 30;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (!/[A-Z]/.test(password)) return "Password must include at least one uppercase letter.";
  if (!/[a-z]/.test(password)) return "Password must include at least one lowercase letter.";
  if (!/[0-9]/.test(password)) return "Password must include at least one number.";
  return null;
}

export function isThrottleError(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("too many requests") || text.includes("rate limit") || text.includes("try again later");
}
