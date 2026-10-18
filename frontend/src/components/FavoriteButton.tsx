import { useToggleFavorite } from '../hooks/useToggleFavorite';
import styles from './FavoriteButton.module.css';

interface FavoriteButtonProps {
  pokemon: { id: number; displayName: string };
  isFavorite: boolean;
  /** "icon" on the cards; "labeled" (heart and text) on the detail page. */
  variant: 'icon' | 'labeled';
}

/**
 * A toggle button: the label stays the same and aria-pressed carries the
 * state, so a screen reader announces "Favorite Pikachu, pressed".
 */
export function FavoriteButton({
  pokemon,
  isFavorite,
  variant,
}: FavoriteButtonProps) {
  const toggle = useToggleFavorite(pokemon);
  const label = `Favorite ${pokemon.displayName}`;

  return (
    <button
      type="button"
      className={`${styles.button} ${styles[variant]}`}
      aria-pressed={isFavorite}
      aria-label={variant === 'icon' ? label : undefined}
      onClick={() => toggle.mutate(!isFavorite)}
    >
      <svg
        className={styles.heart}
        viewBox="0 0 24 24"
        width="20"
        height="20"
        aria-hidden="true"
      >
        <path
          d="M12 20.5s-7.5-4.6-9.3-9.2C1.4 8 3.4 4.5 6.9 4.5c2 0 3.6 1.1 5.1 3 1.5-1.9 3.1-3 5.1-3 3.5 0 5.5 3.5 4.2 6.8-1.8 4.6-9.3 9.2-9.3 9.2Z"
          fill={isFavorite ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      </svg>
      {variant === 'labeled' && <span>{label}</span>}
    </button>
  );
}
