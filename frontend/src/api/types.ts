// Single source of truth: the backend's response types. Type-only, so
// nothing from the backend ends up in the frontend bundle.
export type {
  PokemonDetail,
  PokemonListItem,
  PokemonPage,
} from '../../../backend/src/pokemon/pokemon.types';
