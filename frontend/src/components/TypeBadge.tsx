import type { CSSProperties } from 'react';
import styles from './TypeBadge.module.css';

/** A type pill colored with the --type-{name} tokens from styles/tokens.css. */
export function TypeBadge({ type }: { type: string }) {
  const colors = {
    '--badge-bg': `var(--type-${type})`,
    '--badge-text': `var(--type-${type}-text)`,
  } as CSSProperties;

  return (
    <span className={styles.badge} style={colors}>
      {type}
    </span>
  );
}
