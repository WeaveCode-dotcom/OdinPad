/**
 * Supabase client mock for unit tests.
 *
 * Usage in a test file:
 *
 *   import { vi } from "vitest";
 *   import { mockSupabase, resetSupabaseMock } from "@/test/__mocks__/supabase";
 *
 *   vi.mock("@/integrations/supabase/client", () => ({
 *     supabase: mockSupabase,
 *   }));
 *
 *   beforeEach(() => resetSupabaseMock());
 *
 * By default every query resolves to `{ data: [], error: null }`.
 * Override individual queries in the test:
 *
 *   mockSupabase.from.mockReturnValueOnce({
 *     select: vi.fn().mockResolvedValue({ data: [{ id: "1" }], error: null }),
 *   });
 */

import { vi } from "vitest";

type MockQueryBuilder = {
  select: ReturnType<typeof vi.fn>;
  insert: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
  eq: ReturnType<typeof vi.fn>;
  neq: ReturnType<typeof vi.fn>;
  in: ReturnType<typeof vi.fn>;
  order: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  single: ReturnType<typeof vi.fn>;
  maybeSingle: ReturnType<typeof vi.fn>;
};

function makeQueryBuilder(defaultData: unknown[] = []): MockQueryBuilder {
  const defaultResponse = { data: defaultData, error: null };
  const builder: MockQueryBuilder = {
    select: vi.fn().mockResolvedValue(defaultResponse),
    insert: vi.fn().mockResolvedValue(defaultResponse),
    update: vi.fn().mockResolvedValue(defaultResponse),
    upsert: vi.fn().mockResolvedValue(defaultResponse),
    delete: vi.fn().mockResolvedValue(defaultResponse),
    eq: vi.fn(),
    neq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  // Chain methods return the builder so callers can do .eq(...).select(...)
  builder.eq.mockReturnValue(builder);
  builder.neq.mockReturnValue(builder);
  builder.in.mockReturnValue(builder);
  builder.order.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  return builder;
}

const defaultQueryBuilder = makeQueryBuilder();

export const mockSupabase = {
  from: vi.fn().mockReturnValue(defaultQueryBuilder),
  auth: {
    getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: "mock/path" }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: "https://example.com/mock.jpg" } }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  },
  functions: {
    invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnValue("subscribed"),
  }),
  removeChannel: vi.fn().mockResolvedValue("ok"),
};

/** Call this in `beforeEach` to reset all mock call counts and return values. */
export function resetSupabaseMock(): void {
  vi.clearAllMocks();
  mockSupabase.from.mockReturnValue(makeQueryBuilder());
}
