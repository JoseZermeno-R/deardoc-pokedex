import {
  type InfiniteData,
  type QueryKey,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { setFavorite } from '../api/favorites';
import type { PokemonDetail, PokemonPage } from '../api/types';
import { useToast } from '../lib/toast';

const LISTS = { queryKey: ['pokemon'] };
const DETAILS = { queryKey: ['pokemon-detail'] };

interface Snapshot {
  lists: [QueryKey, InfiniteData<PokemonPage> | undefined][];
  details: [QueryKey, PokemonDetail | undefined][];
}

/**
 * Marks or unmarks a favorite. The heart changes right away in every cached
 * list and detail; if the request fails, they go back and a toast explains.
 */
export function useToggleFavorite(pokemon: {
  id: number;
  displayName: string;
}) {
  const queryClient = useQueryClient();
  const showToast = useToast();

  return useMutation({
    // Requests for the same Pokémon run one after another, so a double click
    // can't reach the server out of order. onMutate still runs on every click.
    scope: { id: `favorite-${pokemon.id}` },
    mutationFn: (isFavorite: boolean) => setFavorite(pokemon.id, isFavorite),

    onMutate: async (isFavorite): Promise<Snapshot> => {
      // A list or detail request in flight would overwrite the optimistic update.
      await queryClient.cancelQueries(LISTS);
      await queryClient.cancelQueries(DETAILS);
      const snapshot = {
        lists: queryClient.getQueriesData<InfiniteData<PokemonPage>>(LISTS),
        details: queryClient.getQueriesData<PokemonDetail>(DETAILS),
      };

      queryClient.setQueriesData<InfiniteData<PokemonPage>>(LISTS, (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((page) => ({
                ...page,
                items: page.items.map((item) =>
                  item.id === pokemon.id ? { ...item, isFavorite } : item,
                ),
              })),
            }
          : data,
      );
      queryClient.setQueriesData<PokemonDetail>(DETAILS, (data) =>
        data?.id === pokemon.id ? { ...data, isFavorite } : data,
      );
      return snapshot;
    },

    onError: (_error, _isFavorite, snapshot) => {
      for (const [key, data] of [
        ...(snapshot?.lists ?? []),
        ...(snapshot?.details ?? []),
      ]) {
        queryClient.setQueryData(key, data);
      }
      showToast(`Couldn't update ${pokemon.displayName}. Try again.`);
    },

    // Mark the caches stale without refetching now: they refresh the next time
    // they're shown, so a click doesn't reload every "Load more" page.
    onSettled: () => {
      void queryClient.invalidateQueries({ ...LISTS, refetchType: 'none' });
      void queryClient.invalidateQueries({ ...DETAILS, refetchType: 'none' });
    },
  });
}
