import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { DataSource, Repository } from 'typeorm';
import { Favorite } from '../favorites/favorite.entity.js';
import type { PokemonSnapshot } from './pokemon-snapshot.js';
import { Pokemon } from './pokemon.entity.js';
import { PokemonModule } from './pokemon.module.js';
import { SeedService } from './seed.service.js';

// Read from the snapshot so the tests keep passing when it is regenerated
// with more Pokémon.
const snapshot = JSON.parse(
  readFileSync(new URL('../../data/pokemon.json', import.meta.url), 'utf8'),
) as PokemonSnapshot;
const SNAPSHOT_SIZE = snapshot.pokemon.length;

describe('SeedService', () => {
  let module: TestingModule;
  let seedService: SeedService;
  let repository: Repository<Pokemon>;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'better-sqlite3',
          database: ':memory:',
          autoLoadEntities: true,
          synchronize: true,
        }),
        PokemonModule,
      ],
    }).compile();

    seedService = module.get(SeedService);
    repository = module.get(DataSource).getRepository(Pokemon);
  });

  afterEach(async () => {
    await module.close();
  });

  it('loads every Pokémon from the snapshot', async () => {
    const count = await seedService.seed();

    expect(count).toBe(SNAPSHOT_SIZE);
    expect(await repository.count()).toBe(SNAPSHOT_SIZE);
  });

  it('can run twice without duplicating rows', async () => {
    await seedService.seed();
    await seedService.seed();

    expect(await repository.count()).toBe(SNAPSHOT_SIZE);
  });

  it('empties the table first, removing rows that are not in the snapshot', async () => {
    await seedService.seed();
    const pikachu = await repository.findOneByOrFail({ id: 25 });
    await repository.insert({ ...pikachu, id: 9999, name: 'not-in-snapshot' });

    await seedService.seed();

    expect(await repository.existsBy({ id: 9999 })).toBe(false);
    expect(await repository.count()).toBe(SNAPSHOT_SIZE);
  });

  it('stores the JSON columns as structured values', async () => {
    await seedService.seed();

    const pikachu = await repository.findOneByOrFail({ name: 'pikachu' });

    expect(pikachu.types).toEqual(['electric']);
    expect(pikachu.stats.speed).toBe(90);
    expect(pikachu.abilities).toContainEqual({
      name: 'lightning-rod',
      isHidden: true,
    });
    expect(pikachu.isLegendary).toBe(false);
  });

  it('deletes every favorite ("nuke and pave")', async () => {
    await seedService.seed();
    const favorites = module.get(DataSource).getRepository(Favorite);
    await favorites.insert({ userId: randomUUID(), pokemonId: 25 });

    await seedService.seed();

    // Emptying the pokemon table cascades to favorites (ON DELETE CASCADE).
    expect(await favorites.count()).toBe(0);
  });
});
