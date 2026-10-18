import { createContext, useContext } from 'react';

// Kept apart from the Toast component so that file only exports components
// (Vite's fast refresh needs that).
export const ToastContext = createContext<(message: string) => void>(() => {});

/** Shows a short message at the bottom of the screen. */
export function useToast(): (message: string) => void {
  return useContext(ToastContext);
}
