import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import './index.css';
import App from './App.tsx';

// Initialize the TanStack Query client with standard parameters
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false, // Turn off automatic query retries so write/read failures are immediate for testing
    },
  },
});

/**
 * Enabled Mock Service Worker in local development before rendering the React App.
 */
async function enableMocking() {
  const { worker } = await import('./mocks/browser');
  // `worker.start()` returns a Promise that resolves when the worker registration is complete
  return worker.start({
    onUnhandledRequest: 'bypass', // bypass unhandled requests to Google Fonts, assets, etc.
  });
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </StrictMode>
  );
});
