/**
 * Manual Vitest mock for the Supabase client.
 *
 * Usage in tests:
 *   vi.mock('@/integrations/supabase/client');
 *   import { supabase } from '@/integrations/supabase/client';
 *   vi.mocked(supabase.from).mockReturnValue(...);
 *
 * Default behaviour: all query methods resolve to `{ data: null, error: null }`.
 * Override per-test with `vi.mocked(supabase.from(...).select).mockResolvedValueOnce(...)`.
 */
import { vi } from "vitest";

/** A minimal chainable query builder that returns `{ data: null, error: null }` by default. */
function makeQueryBuilder() {
  const builder: Record<string, unknown> = {};

  const chainMethods = [
    "select",
    "insert",
    "upsert",
    "update",
    "delete",
    "eq",
    "neq",
    "gt",
    "gte",
    "lt",
    "lte",
    "in",
    "is",
    "like",
    "ilike",
    "contains",
    "order",
    "limit",
    "range",
    "single",
    "maybeSingle",
    "filter",
    "match",
  ] as const;

  for (const method of chainMethods) {
    builder[method] = vi.fn(() => {
      // Methods that terminate the chain resolve the promise
      if (method === "single" || method === "maybeSingle") {
        return Promise.resolve({ data: null, error: null });
      }
      return Object.assign(Promise.resolve({ data: null, error: null }), builder);
    });
  }

  return builder;
}

const _queryBuilder = makeQueryBuilder();

export const supabase = {
  from: vi.fn(() => _queryBuilder),

  auth: {
    getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
    getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
    signInWithOAuth: vi.fn(() => Promise.resolve({ data: { url: null, provider: null }, error: null })),
    signUp: vi.fn(() => Promise.resolve({ data: { user: null, session: null }, error: null })),
    signOut: vi.fn(() => Promise.resolve({ error: null })),
    resetPasswordForEmail: vi.fn(() => Promise.resolve({ data: {}, error: null })),
    updateUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
  },

  storage: {
    from: vi.fn(() => ({
      upload: vi.fn(() => Promise.resolve({ data: null, error: null })),
      remove: vi.fn(() => Promise.resolve({ data: null, error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: "" } })),
      createSignedUrl: vi.fn(() => Promise.resolve({ data: null, error: null })),
      list: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  },

  functions: {
    invoke: vi.fn(() => Promise.resolve({ data: null, error: null })),
  },

  channel: vi.fn(() => ({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn(),
    unsubscribe: vi.fn(),
  })),

  removeChannel: vi.fn(),
};
