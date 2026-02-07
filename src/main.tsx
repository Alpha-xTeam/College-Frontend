import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import "./index.css";
import { App } from "./App";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevents refetching when switching tabs
      staleTime: 1000 * 60 * 10, // Data is fresh for 10 minutes
      gcTime: 1000 * 60 * 30, // Keep in cache for 30 minutes
      retry: 1,
      refetchOnMount: false, // Don't refetch on mount if data is stale but we still have it
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>
);
