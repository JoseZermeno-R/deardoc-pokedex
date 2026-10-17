import {
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Put,
} from '@nestjs/common';
import { UserId } from '../common/user-id.decorator.js';
import { FavoritesService } from './favorites.service.js';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  /** PUT /api/favorites/25 marks Pikachu as a favorite. */
  @Put(':pokemonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  add(
    @Param('pokemonId', ParseIntPipe) pokemonId: number,
    @UserId() userId: string,
  ): Promise<void> {
    return this.favoritesService.add(userId, pokemonId);
  }

  /** DELETE /api/favorites/25 unmarks it; 204 even if it wasn't marked. */
  @Delete(':pokemonId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('pokemonId', ParseIntPipe) pokemonId: number,
    @UserId() userId: string,
  ): Promise<void> {
    return this.favoritesService.remove(userId, pokemonId);
  }
}
