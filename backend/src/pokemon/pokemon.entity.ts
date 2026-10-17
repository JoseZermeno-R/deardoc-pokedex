import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Favorite } from '../favorites/favorite.entity.js';
import type {
  PokemonAbility,
  PokemonStats,
  SnapshotPokemon,
} from './pokemon-snapshot.js';

// Mirrors a snapshot record, so the seed can insert the JSON as is.
@Entity()
export class Pokemon implements SnapshotPokemon {
  /** Not generated: it is the PokeAPI id. */
  @PrimaryColumn('integer')
  id: number;

  @Column('text', { unique: true })
  name: string;

  @Column('text')
  displayName: string;

  @Column('text')
  image: string;

  @Column('simple-json')
  types: string[];

  @Column('real')
  heightM: number;

  @Column('real')
  weightKg: number;

  @Column('simple-json')
  abilities: PokemonAbility[];

  @Column('simple-json')
  stats: PokemonStats;

  @Column('text')
  genus: string;

  @Column('text', { nullable: true })
  description: string | null;

  @Column('integer')
  generation: number;

  @Column('boolean')
  isLegendary: boolean;

  @Column('boolean')
  isMythical: boolean;

  /** Not in the snapshot. Loaded only for the current user, to compute isFavorite. */
  @OneToMany(() => Favorite, (favorite) => favorite.pokemon)
  favorites: Relation<Favorite[]>;
}
