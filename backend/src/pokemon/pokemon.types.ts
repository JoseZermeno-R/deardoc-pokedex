import type { SnapshotPokemon } from './pokemon-snapshot.js';

// Response shapes of the /api/pokemon endpoints.

export interface PokemonListItem {
  id: number;
  name: string;
  displayName: string;
  image: string;
  types: string[];
  isFavorite: boolean;
}

export interface PokemonPage {
  items: PokemonListItem[];
  /** Pokémon matching the search, across all pages. */
  total: number;
  page: number;
  limit: number;
}

export type PokemonDetail = SnapshotPokemon & { isFavorite: boolean };
