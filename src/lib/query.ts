import { QueryClient } from '@tanstack/react-query';
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 0, gcTime: 60_000, retry: false, refetchOnWindowFocus: true },
    mutations: { retry: false },
  },
});
