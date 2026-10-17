import type { PokemonListItem } from '../api/types';
import styles from './PokemonCard.module.css';
import { TypeBadge } from './TypeBadge';

/** #25 → #0025, as in the official Pokédex. */
function formatNumber(id: number): string {
  return `#${String(id).padStart(4, '0')}`;
}

export function PokemonCard({ pokemon }: { pokemon: PokemonListItem }) {
  return (
    <article className={styles.card}>
      <div className={styles.imageBox}>
        <img
          className={styles.image}
          src={pokemon.image}
          alt={pokemon.displayName}
          width={240}
          height={240}
          loading="lazy"
        />
      </div>
      <p className={styles.number}>{formatNumber(pokemon.id)}</p>
      <h2 className={styles.name}>{pokemon.displayName}</h2>
      <ul className={styles.types} aria-label="Types">
        {pokemon.types.map((type) => (
          <li key={type}>
            <TypeBadge type={type} />
          </li>
        ))}
      </ul>
    </article>
  );
}
