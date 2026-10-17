import { useInfiniteQuery } from '@tanstack/react-query';
import { listPokemon } from '../api/pokemon';

/** 24 fills complete rows in the 2, 3, 4 and 6 column layouts. */
export const PAGE_SIZE = 24;

/**
 * The list for a search, one page of 24 per "Load more" click. Pages are
 * kept per search: changing the search starts again from the first page.
 */
export function usePokemonList(search: string) {
  return useInfiniteQuery({
    queryKey: ['pokemon', search],
    queryFn: ({ pageParam, signal }) =>
      listPokemon({ search, page: pageParam, limit: PAGE_SIZE }, signal),
    initialPageParam: 1,
    getNextPageParam: ({ page, limit, total }) =>
      page * limit < total ? page + 1 : undefined,
  });
}
