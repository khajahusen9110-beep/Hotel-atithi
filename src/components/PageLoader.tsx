import React from 'react';

// Lightweight placeholder shown while a lazily loaded page chunk downloads.
export const PageLoader: React.FC = () => (
  <div className="py-6 space-y-4 animate-pulse" aria-busy="true" aria-label="Loading">
    <div className="h-7 w-48 rounded-lg bg-stone-100" />
    <div className="h-4 w-72 max-w-full rounded-md bg-stone-100" />
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="h-36 rounded-2xl bg-stone-100" />
      ))}
    </div>
  </div>
);
