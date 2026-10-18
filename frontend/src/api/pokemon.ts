import { apiGet } from './client';
import type { PokemonDetail, PokemonPage } from './types';

export interface ListPokemonParams {
  search: string;
  page: number;
  limit: number;
}

export function listPokemon(
  { search, page, limit }: ListPokemonParams,
  signal?: AbortSignal,
): Promise<PokemonPage> {
  return apiGet<PokemonPage>('/pokemon', { search, page, limit }, signal);
}

/** Rejects with an ApiError with status 404 when the name doesn't exist. */
export function getPokemon(
  name: string,
  signal?: AbortSignal,
): Promise<PokemonDetail> {
  return apiGet<PokemonDetail>(
    `/pokemon/${encodeURIComponent(name)}`,
    {},
    signal,
  );
}
