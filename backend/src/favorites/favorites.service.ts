import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pokemon } from '../pokemon/pokemon.entity.js';
import { Favorite } from './favorite.entity.js';

// Both operations are idempotent: the client sends the state it wants,
// so retries and repeated clicks leave the same result.
@Injectable()
export class FavoritesService {
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepository: Repository<Favorite>,
    @InjectRepository(Pokemon)
    private readonly pokemonRepository: Repository<Pokemon>,
  ) {}

  async add(userId: string, pokemonId: number): Promise<void> {
    // Checked first so a missing Pokémon is a 404, not a foreign key error (500).
    if (!(await this.pokemonRepository.existsBy({ id: pokemonId }))) {
      throw new NotFoundException(`Pokémon ${pokemonId} not found`);
    }

    // INSERT OR IGNORE: marking an existing favorite again does nothing.
    await this.favoriteRepository
      .createQueryBuilder()
      .insert()
      .values({ userId, pokemonId })
      .orIgnore()
      .execute();
  }

  async remove(userId: string, pokemonId: number): Promise<void> {
    await this.favoriteRepository.delete({ userId, pokemonId });
  }
}
