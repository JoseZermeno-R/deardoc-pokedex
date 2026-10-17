import { INestApplication } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type {
  PokemonDetail,
  PokemonPage,
} from '../src/pokemon/pokemon.types.js';
import { createTestApp } from './create-test-app.js';

const PIKACHU = 25;

describe('Favorites', () => {
  let app: INestApplication<App>;
  // A fresh user per test keeps the tests independent without cleaning up.
  let userId: string;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(() => {
    userId = randomUUID();
  });

  afterAll(async () => {
    await app.close();
  });

  const server = () => request(app.getHttpServer());

  function markFavorite(pokemonId: number | string, user = userId) {
    return server().put(`/api/favorites/${pokemonId}`).set('X-User-Id', user);
  }

  function unmarkFavorite(pokemonId: number | string, user = userId) {
    return server()
      .delete(`/api/favorites/${pokemonId}`)
      .set('X-User-Id', user);
  }

  async function isFavoriteInList(pokemonId: number, user = userId) {
    const response = await server()
      .get('/api/pokemon')
      .query({ search: 'pikachu' })
      .set('X-User-Id', user)
      .expect(200);
    const { items } = response.body as PokemonPage;
    return items.find((p) => p.id === pokemonId)?.isFavorite;
  }

  async function isFavoriteInDetail(name: string, user = userId) {
    const response = await server()
      .get(`/api/pokemon/${name}`)
      .set('X-User-Id', user)
      .expect(200);
    return (response.body as PokemonDetail).isFavorite;
  }

  it('marks a favorite, shown in the list and the detail', async () => {
    await markFavorite(PIKACHU).expect(204);

    expect(await isFavoriteInList(PIKACHU)).toBe(true);
    expect(await isFavoriteInDetail('pikachu')).toBe(true);
  });

  it('marks only the requested Pokémon', async () => {
    await markFavorite(PIKACHU).expect(204);

    const response = await server()
      .get('/api/pokemon')
      .query({ limit: 30 })
      .set('X-User-Id', userId)
      .expect(200);
    const favorites = (response.body as PokemonPage).items.filter(
      (p) => p.isFavorite,
    );

    expect(favorites.map((p) => p.id)).toEqual([PIKACHU]);
  });

  it('can mark the same favorite twice', async () => {
    await markFavorite(PIKACHU).expect(204);
    await markFavorite(PIKACHU).expect(204);

    expect(await isFavoriteInList(PIKACHU)).toBe(true);
  });

  it('unmarks a favorite', async () => {
    await markFavorite(PIKACHU).expect(204);

    await unmarkFavorite(PIKACHU).expect(204);

    expect(await isFavoriteInList(PIKACHU)).toBe(false);
    expect(await isFavoriteInDetail('pikachu')).toBe(false);
  });

  it('responds 204 when unmarking something that was not marked', async () => {
    await unmarkFavorite(PIKACHU).expect(204);
  });

  it("doesn't show a user's favorites to another user", async () => {
    await markFavorite(PIKACHU).expect(204);

    expect(await isFavoriteInList(PIKACHU, randomUUID())).toBe(false);
    expect(await isFavoriteInDetail('pikachu', randomUUID())).toBe(false);
  });

  it('shows no favorites without X-User-Id', async () => {
    await markFavorite(PIKACHU).expect(204);

    const response = await server().get('/api/pokemon/pikachu').expect(200);

    expect((response.body as PokemonDetail).isFavorite).toBe(false);
  });

  it('responds 404 when the Pokémon does not exist', async () => {
    await markFavorite(99999).expect(404);
  });

  it('responds 400 when X-User-Id is missing, naming the header', async () => {
    const response = await server()
      .put(`/api/favorites/${PIKACHU}`)
      .expect(400);
    await server().delete(`/api/favorites/${PIKACHU}`).expect(400);

    expect((response.body as { message: string }).message).toBe(
      'The X-User-Id header must be a UUID',
    );
  });

  it('responds 400 when X-User-Id is not a UUID', async () => {
    await markFavorite(PIKACHU, 'not-a-uuid').expect(400);
    await unmarkFavorite(PIKACHU, 'not-a-uuid').expect(400);
  });

  it('responds 400 when the Pokémon id is not a number', async () => {
    await markFavorite('pikachu').expect(400);
    await unmarkFavorite('pikachu').expect(400);
  });
});
