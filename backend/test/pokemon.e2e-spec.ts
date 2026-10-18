import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import type { App } from 'supertest/types.js';
import type {
  PokemonDetail,
  PokemonPage,
} from '../src/pokemon/pokemon.types.js';
import { createTestApp } from './create-test-app.js';

describe('GET /api/pokemon', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  async function list(query: Record<string, string | number> = {}) {
    const response = await request(app.getHttpServer())
      .get('/api/pokemon')
      .query(query)
      .expect(200);
    return response.body as PokemonPage;
  }

  describe('pagination', () => {
    it('returns the first 24 Pokémon by default, ordered by id', async () => {
      const page = await list();

      expect(page).toMatchObject({ page: 1, limit: 24 });
      expect(page.total).toBeGreaterThanOrEqual(1025);
      expect(page.items).toHaveLength(24);
      expect(page.items.map((p) => p.id)).toEqual(
        Array.from({ length: 24 }, (_, i) => i + 1),
      );
    });

    it('returns only the fields a card needs', async () => {
      const { items } = await list({ limit: 1 });

      expect(items[0]).toEqual({
        id: 1,
        name: 'bulbasaur',
        displayName: 'Bulbasaur',
        image:
          'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png',
        types: ['grass', 'poison'],
        isFavorite: false,
      });
    });

    it('returns the requested page', async () => {
      const page = await list({ page: 2, limit: 10 });

      expect(page.items.map((p) => p.id)).toEqual([
        11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
      ]);
    });

    it('returns the remainder on the last page and nothing after it', async () => {
      const { total } = await list({ limit: 1 });
      const lastPage = Math.ceil(total / 100);

      const last = await list({ page: lastPage, limit: 100 });
      const afterLast = await list({ page: lastPage + 1, limit: 100 });

      expect(last.items).toHaveLength(total - (lastPage - 1) * 100);
      expect(afterLast.items).toEqual([]);
    });

    it.each([
      ['page', '0'],
      ['page', 'abc'],
      ['page', '1.5'],
      ['limit', '0'],
      ['limit', '101'],
    ])('responds 400 when %s is %s', async (param, value) => {
      await request(app.getHttpServer())
        .get('/api/pokemon')
        .query({ [param]: value })
        .expect(400);
    });
  });

  describe('search', () => {
    it('matches part of the name, ignoring case', async () => {
      const { items } = await list({ search: 'PIKA' });

      expect(items.map((p) => p.name)).toContain('pikachu');
      for (const pokemon of items) {
        expect(`${pokemon.name} ${pokemon.displayName}`).toMatch(/pika/i);
      }
    });

    it('matches both the slug and the display name', async () => {
      const bySlug = await list({ search: 'mr-mime' });
      const byDisplayName = await list({ search: 'mr. mime' });

      expect(bySlug.items.map((p) => p.name)).toEqual(['mr-mime']);
      expect(byDisplayName.items.map((p) => p.name)).toEqual(['mr-mime']);
    });

    it('ignores surrounding spaces', async () => {
      const { items } = await list({ search: '  pikachu  ' });

      expect(items.map((p) => p.name)).toEqual(['pikachu']);
    });

    // Found by trying the Pokémon with unusual names.
    it.each([
      ["farfetch'd", 'farfetchd'], // a straight apostrophe; the name has ’
      ['mr mime', 'mr-mime'], // a space instead of ". "
      ['MR. MIME', 'mr-mime'],
      ['type null', 'type-null'], // no colon
      ['ho oh', 'ho-oh'], // a space instead of the hyphen
      ['porygon z', 'porygon-z'],
      ['FLABÉBÉ', 'flabebe'], // uppercase accents, which LIKE doesn't fold
      ['nidoran f', 'nidoran-f'],
    ])(
      'finds %s ignoring punctuation, spaces and accents',
      async (search, name) => {
        const { items } = await list({ search });

        expect(items.map((p) => p.name)).toContain(name);
      },
    );

    it.each(['♀', 'nidoran♀'])(
      'matches symbols as typed: %s finds only Nidoran♀',
      async (search) => {
        const { items } = await list({ search });

        // Compacting would drop the ♀ and also find Nidoran♂.
        expect(items.map((p) => p.name)).toEqual(['nidoran-f']);
      },
    );

    it('counts the matches across all pages', async () => {
      const page = await list({ search: 'a', limit: 5 });

      expect(page.items).toHaveLength(5);
      expect(page.total).toBeGreaterThan(5);
    });

    it('responds 200 with no items when nothing matches', async () => {
      const page = await list({ search: 'missingno' });

      expect(page).toMatchObject({ items: [], total: 0 });
    });

    it.each(['%', '_'])(
      'treats %s as a literal character, not a wildcard',
      async (search) => {
        const page = await list({ search });

        expect(page.total).toBe(0);
      },
    );
  });

  it('responds 400 when X-User-Id is not a UUID', async () => {
    await request(app.getHttpServer())
      .get('/api/pokemon')
      .set('X-User-Id', 'not-a-uuid')
      .expect(400);
  });
});

describe('GET /api/pokemon/:name', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns the full detail', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pokemon/mr-mime')
      .expect(200);
    const detail = response.body as PokemonDetail;

    expect(detail).toMatchObject({
      id: 122,
      name: 'mr-mime',
      displayName: 'Mr. Mime',
      types: ['psychic', 'fairy'],
      genus: 'Barrier Pokémon',
      generation: 1,
      isFavorite: false,
    });
    expect(Object.keys(detail.stats)).toHaveLength(6);
    expect(detail).not.toHaveProperty('favorites');
  });

  it('ignores the case of the name', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/pokemon/Pikachu')
      .expect(200);

    expect((response.body as PokemonDetail).id).toBe(25);
  });

  it('responds 404 when the Pokémon does not exist', async () => {
    await request(app.getHttpServer())
      .get('/api/pokemon/missingno')
      .expect(404);
  });
});
