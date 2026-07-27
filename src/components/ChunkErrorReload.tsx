'use client';

import { useEffect } from 'react';

const RELOAD_FLAG_KEY = 'chunk-error-reload-at';
const RELOAD_COOLDOWN_MS = 10_000;

function isChunkLoadError(message: unknown): boolean {
  const text = String(message ?? '');
  return (
    text.includes('ChunkLoadError') ||
    text.includes('Loading chunk') ||
    text.includes('Failed to fetch dynamically imported module') ||
    text.includes('Importing a module script failed')
  );
}

function reloadOnce() {
  const last = Number(sessionStorage.getItem(RELOAD_FLAG_KEY) || 0);
  if (Date.now() - last < RELOAD_COOLDOWN_MS) return;
  sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()));
  window.location.reload();
}

export default function ChunkErrorReload() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.message) || isChunkLoadError(event.error?.message)) {
        reloadOnce();
      }
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason?.message) || isChunkLoadError(event.reason)) {
        reloadOnce();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
