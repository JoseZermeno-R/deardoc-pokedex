import { apiGet } from './client';
import type { PokemonPage } from './types';

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
