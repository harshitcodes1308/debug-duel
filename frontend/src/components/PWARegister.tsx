'use client';

import { useEffect } from 'react';

export default function PWARegister() {
  useEffect(() => {
    if (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      window.location.hostname !== 'localhost' || true // Enable for testing locally as well
    ) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('PWA Service Worker registered successfully scope:', registration.scope);
        })
        .catch((error) => {
          console.error('PWA Service Worker registration failed:', error);
        });
    }
  }, []);

  return null;
}
