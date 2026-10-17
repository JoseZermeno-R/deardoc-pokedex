import type { ReactNode } from 'react';
import styles from './NotFound.module.css';

export function NotFound({
  message,
  children,
}: {
  message: string;
  /** An action that gets the user out, e.g. "Clear search". */
  children?: ReactNode;
}) {
  return (
    <section className={styles.notFound} role="status">
      <p className={styles.code}>404</p>
      <p className={styles.message}>{message}</p>
      {children}
    </section>
  );
}
