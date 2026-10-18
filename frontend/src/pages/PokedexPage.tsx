import { useSearchParams } from 'react-router';
import { NotFound } from '../components/NotFound';
import { PokemonCard } from '../components/PokemonCard';
import { SearchBar } from '../components/SearchBar';
import { PAGE_SIZE, usePokemonList } from '../hooks/usePokemonList';
import buttons from '../styles/buttons.module.css';
import styles from './PokedexPage.module.css';

const numberFormat = new Intl.NumberFormat('en-US');

export function PokedexPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  // Only the search lives in the URL; "Load more" pages are not kept there.
  const search = searchParams.get('search')?.trim() ?? '';
  const list = usePokemonList(search);

  function handleSearch(term: string) {
    if (term === search) return;
    // replace: typing doesn't fill the browser history with every search.
    setSearchParams(term ? { search: term } : {}, { replace: true });
  }

  return (
    <>
      <h1 className="sr-only">Pokédex</h1>
      <div className={styles.band}>
        <div className={styles.bandInner}>
          <SearchBar value={search} onSearch={handleSearch} />
        </div>
      </div>
      <div className={styles.content}>{renderResults()}</div>
    </>
  );

  function renderResults() {
    if (list.data === undefined) {
      if (list.isError) {
        return (
          <div className={styles.error} role="alert">
            <p>Couldn't load Pokémon.</p>
            <button
              type="button"
              className={buttons.secondary}
              onClick={() => list.refetch()}
            >
              Try again
            </button>
          </div>
        );
      }
      return <LoadingGrid />;
    }

    const pokemon = list.data.pages.flatMap((page) => page.items);
    const total = list.data.pages[0]?.total ?? 0;

    if (total === 0) {
      return search ? (
        <NotFound message={`No Pokémon match “${search}”.`}>
          <button
            type="button"
            className={buttons.secondary}
            onClick={() => handleSearch('')}
          >
            Clear search
          </button>
        </NotFound>
      ) : (
        <NotFound message="There are no Pokémon yet. Run npm run seed to load them." />
      );
    }

    return (
      <>
        <p className={styles.count} aria-live="polite">
          Showing {numberFormat.format(pokemon.length)} of{' '}
          {numberFormat.format(total)} Pokémon
        </p>
        <ul className={styles.grid}>
          {pokemon.map((item) => (
            <li key={item.id}>
              <PokemonCard pokemon={item} />
            </li>
          ))}
        </ul>
        {list.hasNextPage && (
          <div className={styles.loadMore}>
            {list.isFetchNextPageError && (
              <p role="alert">Couldn't load more Pokémon. Try again.</p>
            )}
            <button
              type="button"
              className={buttons.primary}
              onClick={() => list.fetchNextPage()}
              disabled={list.isFetchingNextPage}
              aria-busy={list.isFetchingNextPage}
            >
              {list.isFetchingNextPage ? 'Loading…' : 'Load more Pokémon'}
            </button>
          </div>
        )}
      </>
    );
  }
}

function LoadingGrid() {
  return (
    <div aria-busy="true">
      <p className="sr-only" role="status">
        Loading Pokémon…
      </p>
      <ul className={styles.grid} aria-hidden="true">
        {Array.from({ length: PAGE_SIZE }, (_, index) => (
          <li key={index}>
            <div className={styles.skeletonImage} />
            <div className={styles.skeletonLine} />
          </li>
        ))}
      </ul>
    </div>
  );
}
