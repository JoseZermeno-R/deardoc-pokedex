import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Pokemon } from '../pokemon/pokemon.entity.js';
import { Favorite } from './favorite.entity.js';
import { FavoritesController } from './favorites.controller.js';
import { FavoritesService } from './favorites.service.js';

@Module({
  // Both repositories are used directly, so this module doesn't import
  // PokemonModule (which would make the two modules depend on each other).
  imports: [TypeOrmModule.forFeature([Favorite, Pokemon])],
  controllers: [FavoritesController],
  providers: [FavoritesService],
})
export class FavoritesModule {}
