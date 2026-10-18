import { useQuery } from '@tanstack/react-query';
import { ApiError } from '../api/client';
import { getPokemon } from '../api/pokemon';

export function usePokemonDetail(name: string) {
  return useQuery({
    queryKey: ['pokemon-detail', name],
    queryFn: ({ signal }) => getPokemon(name, signal),
    // A missing Pokémon won't appear on a retry; other errors get one.
    retry: (failureCount, error) =>
      !(error instanceof ApiError && error.status === 404) && failureCount < 1,
  });
}
