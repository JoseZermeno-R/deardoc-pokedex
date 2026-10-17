import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Query string of GET /api/pokemon. Invalid values respond 400. */
export class ListPokemonQuery {
  /** Matched against the slug and the display name. */
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  // Query string values arrive as text; @Type converts them before validating.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 24;
}
