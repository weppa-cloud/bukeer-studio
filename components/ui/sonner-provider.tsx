'use client';

import { Toaster } from 'sonner';

export function SonnerProvider() {
  return (
    <Toaster
      position="bottom-right"
      toastOptions={{
        className: 'rounded-xl shadow-lg',
        duration: 4000,
      }}
      richColors
      closeButton
    />
  );
}
