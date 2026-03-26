import { QueryClient } from "@tanstack/react-query";

/**
 * App-wide React Query defaults. Per-query overrides can tighten staleTime or enable refetchOnWindowFocus for auth/session.
 */
export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60_000,
        gcTime: 30 * 60_000,
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}
