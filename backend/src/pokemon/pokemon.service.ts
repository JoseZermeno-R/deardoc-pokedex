import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import type { ListPokemonQuery } from './list-pokemon.query.js';
import { Pokemon } from './pokemon.entity.js';
import type { PokemonDetail, PokemonPage } from './pokemon.types.js';

/** "Farfetch'd" → "farfetchd", "MR. MIME" → "mrmime", "Flabébé" → "flabebe" */
function toCompact(text: string): string {
  return text
    .normalize('NFD') // é → e + a combining accent
    .replace(/\p{Diacritic}/gu, '') // drop the accents
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ''); // drop spaces, punctuation and symbols
}

@Injectable()
export class PokemonService {
  constructor(
    @InjectRepository(Pokemon)
    private readonly pokemonRepository: Repository<Pokemon>,
  ) {}

  async list(
    { search, page, limit }: ListPokemonQuery,
    userId?: string,
  ): Promise<PokemonPage> {
    const query = this.queryWithFavorites(userId);

    const term = search?.trim();
    if (term) {
      // The display name, as typed: catches symbols like ♀ and ♂.
      // ESCAPE '!' makes % and _ in the search match literally.
      const displayNameMatch = "pokemon.displayName LIKE :pattern ESCAPE '!'";
      const pattern = `%${term.replace(/[%_!]/g, '!$&')}%`;

      // The slug without hyphens, against the term without punctuation,
      // spaces or accents: "farfetch'd", "mr mime" and "FLABÉBÉ" find
      // farfetchd, mr-mime and flabebe. Slugs only have a-z, 0-9 and hyphens.
      // Not for symbols (\p{S}, like ♀): compacting would drop them, and
      // "nidoran♀" would also find Nidoran♂.
      const compact = /\p{S}/u.test(term) ? '' : toCompact(term);
      if (compact) {
        query.where(
          `(REPLACE(pokemon.name, '-', '') LIKE :compact OR ${displayNameMatch})`,
          { compact: `%${compact}%`, pattern },
        );
      } else {
        query.where(displayNameMatch, { pattern });
      }
    }

    const [pokemon, total] = await query
      .orderBy('pokemon.id')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: pokemon.map(
        ({ id, name, displayName, image, types, favorites }) => ({
          id,
          name,
          displayName,
          image,
          types,
          isFavorite: favorites.length > 0,
        }),
      ),
      total,
      page,
      limit,
    };
  }

  async findByName(name: string, userId?: string): Promise<PokemonDetail> {
    const pokemon = await this.queryWithFavorites(userId)
      .where('pokemon.name = :name', { name: name.toLowerCase() })
      .getOne();
    if (!pokemon) {
      throw new NotFoundException(`Pokémon "${name}" not found`);
    }

    const { favorites, ...detail } = pokemon;
    return { ...detail, isFavorite: favorites.length > 0 };
  }

  /**
   * Joins only the current user's favorite, so `favorites` has 0 or 1 rows.
   * Without a user id the condition matches nothing and every Pokémon gets
   * an empty array.
   */
  private queryWithFavorites(userId?: string): SelectQueryBuilder<Pokemon> {
    return this.pokemonRepository
      .createQueryBuilder('pokemon')
      .leftJoinAndSelect(
        'pokemon.favorites',
        'favorite',
        'favorite.userId = :userId',
        {
          userId: userId ?? null,
        },
      );
  }
}
