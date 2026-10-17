import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Favorite } from '../favorites/favorite.entity.js';
import { PokemonController } from './pokemon.controller.js';
import { Pokemon } from './pokemon.entity.js';
import { PokemonService } from './pokemon.service.js';
import { SeedService } from './seed.service.js';

@Module({
  // Favorite is registered here too: Pokemon has a relation to it, and
  // autoLoadEntities only knows the entities passed to forFeature.
  imports: [TypeOrmModule.forFeature([Pokemon, Favorite])],
  controllers: [PokemonController],
  providers: [PokemonService, SeedService],
  exports: [SeedService],
})
export class PokemonModule {}
