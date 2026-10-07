import React from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
}

const RELOAD_FLAG = 'hotel_atithi_chunk_reload';

// A new deploy replaces the hashed JS chunks, so a tab opened before the deploy
// fails to lazy-load a page. Reload once to pick up the new build.
const isChunkLoadError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(
    message
  );
};

class ErrorBoundaryInner extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled UI error:', error);
    if (isChunkLoadError(error)) {
      try {
        // At most one automatic reload per 30s, so a real outage can't cause a reload loop
        const lastReload = Number(sessionStorage.getItem(RELOAD_FLAG) || 0);
        if (Date.now() - lastReload > 30_000) {
          sessionStorage.setItem(RELOAD_FLAG, String(Date.now()));
          window.location.reload();
        }
      } catch {
        // sessionStorage unavailable: fall through to the error screen
      }
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="py-20 px-4 text-center max-w-md mx-auto space-y-4">
        <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto" />
        <h1 className="font-display font-extrabold text-xl text-stone-900">Something went wrong</h1>
        <p className="text-sm text-stone-500">
          Sorry about that. Please reload the page — your cart is saved.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Reload
        </button>
      </div>
    );
  }
}

// Keyed by path so that navigating to another page clears a previous error screen.
export const ErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { pathname } = useLocation();
  return <ErrorBoundaryInner key={pathname}>{children}</ErrorBoundaryInner>;
};
