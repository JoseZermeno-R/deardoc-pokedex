import { Injectable, Logger } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { DataSource } from 'typeorm';
import type { PokemonSnapshot } from './pokemon-snapshot.js';
import { Pokemon } from './pokemon.entity.js';

// Same relative path from src/ (tests) and dist/ (build).
const SNAPSHOT_FILE = new URL('../../data/pokemon.json', import.meta.url);
const INSERT_CHUNK_SIZE = 100;

@Injectable()
export class SeedService {
  private readonly logger = new Logger(SeedService.name);

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Replaces the pokemon table with the snapshot. Runs in one transaction,
   * so a failure leaves the previous data untouched. Favorites are not touched.
   */
  async seed(): Promise<number> {
    const snapshot = JSON.parse(
      await readFile(SNAPSHOT_FILE, 'utf8'),
    ) as PokemonSnapshot;
    if (snapshot.pokemon.length !== snapshot.count) {
      throw new Error(
        `Snapshot lists ${snapshot.count} Pokémon but contains ${snapshot.pokemon.length}`,
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.clear(Pokemon);
      // Chunks keep each INSERT well under SQLite's bound-parameter limit.
      for (let i = 0; i < snapshot.pokemon.length; i += INSERT_CHUNK_SIZE) {
        await manager.insert(
          Pokemon,
          snapshot.pokemon.slice(i, i + INSERT_CHUNK_SIZE),
        );
      }
    });

    this.logger.log(
      `Seeded ${snapshot.count} Pokémon from the snapshot generated at ${snapshot.generatedAt}`,
    );
    return snapshot.count;
  }
}
