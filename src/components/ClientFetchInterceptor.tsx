'use client';

import { useEffect } from 'react';

/**
 * Ensures that client-side fetch calls to /api/... are automatically prefixed
 * with the Next.js basePath (/ard) to prevent 404s when navigating across Hub and downstream.
 */
export function ClientFetchInterceptor() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      if (typeof input === 'string') {
        if (input.startsWith('/api/')) {
          input = `/ard${input}`;
        }
      } else if (input instanceof URL) {
        if (input.pathname.startsWith('/api/')) {
          input = new URL(`/ard${input.pathname}${input.search}`, input.origin);
        }
      }
      return originalFetch.call(this, input, init);
    };
  }, []);

  return null;
}
