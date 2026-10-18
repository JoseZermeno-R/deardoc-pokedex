import { apiSend } from './client';

/** Sends the state the user wants: PUT marks, DELETE unmarks. Both are idempotent. */
export function setFavorite(
  pokemonId: number,
  isFavorite: boolean,
): Promise<void> {
  return apiSend(isFavorite ? 'PUT' : 'DELETE', `/favorites/${pokemonId}`);
}
