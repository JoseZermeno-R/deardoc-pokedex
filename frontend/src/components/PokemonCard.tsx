import { Link } from 'react-router';
import type { PokemonListItem } from '../api/types';
import { FavoriteButton } from './FavoriteButton';
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
        {/* Fixed size and lazy loading: the grid doesn't jump while images arrive. */}
        <img
          className={styles.image}
          src={pokemon.image}
          alt={pokemon.displayName}
          width={240}
          height={240}
          loading="lazy"
        />
        <div className={styles.favorite}>
          <FavoriteButton
            pokemon={pokemon}
            isFavorite={pokemon.isFavorite}
            variant="icon"
          />
        </div>
      </div>
      <p className={styles.number}>{formatNumber(pokemon.id)}</p>
      <h2 className={styles.name}>
        {/* Stretched over the whole card; the favorite button sits on top of it. */}
        <Link to={`/pokemon/${pokemon.name}`} className={styles.link}>
          {pokemon.displayName}
        </Link>
      </h2>
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
