'use client';

import { ErrorBoundary } from 'react-error-boundary';

export function ErrorBoundaryClient({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary 
      fallback={<div>Error loading page</div>}
      onError={(error) => console.error(error)}
    >
      {children}
    </ErrorBoundary>
  );
} 