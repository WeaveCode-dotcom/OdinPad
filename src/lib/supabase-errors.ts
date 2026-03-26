import type { AuthError, PostgrestError } from "@supabase/supabase-js";

function isPostgrestError(e: unknown): e is PostgrestError {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    "message" in e &&
    typeof (e as PostgrestError).message === "string"
  );
}

function isAuthError(e: unknown): e is AuthError {
  return typeof e === "object" && e !== null && "message" in e && "status" in e;
}

/**
 * Maps Supabase PostgREST / Postgres / Auth errors to short, user-facing copy.
 */
export function mapSupabaseError(error: unknown): string {
  if (error == null) return "Something went wrong. Try again.";

  if (typeof error === "string" && error.trim()) return error.trim();

  if (isAuthError(error)) {
    const m = error.message?.toLowerCase() ?? "";
    if (m.includes("jwt") || m.includes("expired") || m.includes("invalid")) {
      return "Your session expired. Sign out and sign in again.";
    }
    return error.message || "Authentication failed.";
  }

  if (isPostgrestError(error)) {
    const code = error.code;
    const msg = error.message || "";

    switch (code) {
      case "PGRST116":
        return "No data found.";
      case "23505":
        return "That value already exists.";
      case "23503":
        return "This item is still linked to something else.";
      case "42501":
      case "401":
        return "You do not have permission to do that.";
      case "42P01":
        return "A database object is missing. Contact support if this persists.";
      default:
        break;
    }

    const lower = msg.toLowerCase();
    if (lower.includes("jwt") || lower.includes("expired")) {
      return "Your session expired. Sign out and sign in again.";
    }
    if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
      return "Network error. Check your connection and try again.";
    }
    if (lower.includes("timeout") || lower.includes("timed out")) {
      return "The request timed out. Try again in a moment.";
    }
    if (lower.includes("rate limit") || lower.includes("too many requests") || code === "429") {
      return "Too many requests. Wait a moment and try again.";
    }
    if (lower.includes("offline") || lower.includes("internet")) {
      return "You appear to be offline. Reconnect and try again.";
    }

    if (msg.length > 0 && msg.length < 200) return msg;
  }

  if (error instanceof Error && error.message) {
    const m = error.message.toLowerCase();
    if (m.includes("network") || m.includes("fetch") || m.includes("failed to fetch")) {
      return "Network error. Check your connection and try again.";
    }
    if (m.includes("abort")) {
      return "Request was cancelled. Try again.";
    }
    return error.message.length < 200 ? error.message : `${error.message.slice(0, 197)}…`;
  }

  return "Something went wrong. Try again.";
}
