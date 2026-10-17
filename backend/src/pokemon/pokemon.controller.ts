import { Controller, Get, Param, Query } from '@nestjs/common';
import { UserId } from '../common/user-id.decorator.js';
import { ListPokemonQuery } from './list-pokemon.query.js';
import { PokemonService } from './pokemon.service.js';
import type { PokemonDetail, PokemonPage } from './pokemon.types.js';

@Controller('pokemon')
export class PokemonController {
  constructor(private readonly pokemonService: PokemonService) {}

  /** GET /api/pokemon?search=pika&page=1&limit=24 */
  @Get()
  list(
    @Query() query: ListPokemonQuery,
    @UserId({ optional: true }) userId?: string,
  ): Promise<PokemonPage> {
    return this.pokemonService.list(query, userId);
  }

  /** GET /api/pokemon/mr-mime */
  @Get(':name')
  findOne(
    @Param('name') name: string,
    @UserId({ optional: true }) userId?: string,
  ): Promise<PokemonDetail> {
    return this.pokemonService.findByName(name, userId);
  }
}
