import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { ApiError } from '../api/client';
import type { PokemonDetail } from '../api/types';
import { FavoriteButton } from '../components/FavoriteButton';
import { NotFound } from '../components/NotFound';
import { TypeBadge } from '../components/TypeBadge';
import { usePokemonDetail } from '../hooks/usePokemonDetail';
import buttons from '../styles/buttons.module.css';
import styles from './PokemonDetailPage.module.css';

/** The highest base stat in the data (Blissey's HP): a full bar. */
const MAX_STAT = 255;

const STATS: [keyof PokemonDetail['stats'], string][] = [
  ['hp', 'HP'],
  ['attack', 'Attack'],
  ['defense', 'Defense'],
  ['specialAttack', 'Special attack'],
  ['specialDefense', 'Special defense'],
  ['speed', 'Speed'],
];

const GENERATIONS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];

/** lightning-rod → Lightning Rod */
function formatAbility(slug: string): string {
  return slug
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function ExploreMoreLink() {
  return (
    <Link to="/" className={buttons.primary}>
      Explore more Pokémon
    </Link>
  );
}

export function PokemonDetailPage() {
  const { name = '' } = useParams();
  const detail = usePokemonDetail(name);

  // Coming from far down the list, the page would otherwise open mid-scroll.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [name]);

  if (detail.isPending) {
    return (
      <div className={styles.page} aria-busy="true">
        <p className="sr-only" role="status">
          Loading Pokémon…
        </p>
        <div className={styles.layout} aria-hidden="true">
          <div className={`${styles.imageBox} ${styles.skeleton}`} />
          <div className={styles.info}>
            <div className={styles.skeletonLine} />
            <div className={styles.skeletonLine} />
            <div className={`${styles.profile} ${styles.skeleton}`} />
          </div>
        </div>
      </div>
    );
  }

  if (detail.isError) {
    if (detail.error instanceof ApiError && detail.error.status === 404) {
      return (
        <>
          <title>Pokémon not found | Pokédex</title>
          <h1 className="sr-only">Pokémon not found</h1>
          <NotFound message={`There's no Pokémon called “${name}”.`}>
            <ExploreMoreLink />
          </NotFound>
        </>
      );
    }
    return (
      <div className={styles.error} role="alert">
        <p>Couldn't load this Pokémon.</p>
        <button
          type="button"
          className={buttons.secondary}
          onClick={() => detail.refetch()}
        >
          Try again
        </button>
      </div>
    );
  }

  const pokemon = detail.data;

  return (
    <article className={styles.page}>
      <title>{`${pokemon.displayName} | Pokédex`}</title>

      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>
            {pokemon.displayName}{' '}
            <span className={styles.number}>
              #{String(pokemon.id).padStart(4, '0')}
            </span>
          </h1>
          <p className={styles.subtitle}>
            {pokemon.genus} · Generation{' '}
            {GENERATIONS[pokemon.generation - 1] ?? pokemon.generation}
            {pokemon.isLegendary && (
              <span className={styles.badge}>Legendary</span>
            )}
            {pokemon.isMythical && (
              <span className={styles.badge}>Mythical</span>
            )}
          </p>
        </div>
        <FavoriteButton
          pokemon={pokemon}
          isFavorite={pokemon.isFavorite}
          variant="labeled"
        />
      </header>

      <div className={styles.layout}>
        <div className={styles.imageBox}>
          <img
            className={styles.image}
            src={pokemon.image}
            alt={pokemon.displayName}
            width={475}
            height={475}
          />
        </div>

        <div className={styles.info}>
          {pokemon.description && (
            <p className={styles.description}>{pokemon.description}</p>
          )}

          <dl className={styles.profile}>
            <div>
              <dt>Height</dt>
              <dd>{pokemon.heightM} m</dd>
            </div>
            <div>
              <dt>Weight</dt>
              <dd>{pokemon.weightKg} kg</dd>
            </div>
            <div>
              <dt>Category</dt>
              <dd>{pokemon.genus.replace(/ Pokémon$/, '')}</dd>
            </div>
            <div>
              <dt>Abilities</dt>
              {/* Like the official Pokédex, hidden abilities aren't listed. */}
              {pokemon.abilities
                .filter((ability) => !ability.isHidden)
                .map((ability) => (
                  <dd key={ability.name}>{formatAbility(ability.name)}</dd>
                ))}
            </div>
          </dl>

          <section aria-labelledby="types-heading">
            <h2 id="types-heading" className={styles.sectionTitle}>
              Type
            </h2>
            <ul className={styles.types}>
              {pokemon.types.map((type) => (
                <li key={type}>
                  <TypeBadge type={type} />
                </li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="stats-heading">
            <h2 id="stats-heading" className={styles.sectionTitle}>
              Base stats
            </h2>
            {/* The number is the information; the bar only illustrates it. */}
            <dl className={styles.stats}>
              {STATS.map(([key, label]) => (
                <div key={key} className={styles.stat}>
                  <dt>{label}</dt>
                  <dd className={styles.statValue}>{pokemon.stats[key]}</dd>
                  <dd className={styles.statBar} aria-hidden="true">
                    <div
                      style={{
                        width: `${(pokemon.stats[key] / MAX_STAT) * 100}%`,
                      }}
                    />
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>

      <div className={styles.footer}>
        <ExploreMoreLink />
      </div>
    </article>
  );
}
