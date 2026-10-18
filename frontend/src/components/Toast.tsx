import { type ReactNode, useEffect, useState } from 'react';
import { ToastContext } from '../lib/toast';
import styles from './Toast.module.css';

const VISIBLE_MS = 5000;

/** One message at a time; a new one replaces the current one. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (message === null) return;
    const timer = window.setTimeout(() => setMessage(null), VISIBLE_MS);
    return () => window.clearTimeout(timer);
  }, [message]);

  return (
    <ToastContext.Provider value={setMessage}>
      {children}
      {/* The live region is always rendered, so screen readers announce new messages. */}
      <div className={styles.region} role="status" aria-live="polite">
        {message && (
          <div className={styles.toast}>
            <span>{message}</span>
            <button
              type="button"
              className={styles.close}
              onClick={() => setMessage(null)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
