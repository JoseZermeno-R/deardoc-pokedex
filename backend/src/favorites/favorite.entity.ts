import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { Pokemon } from '../pokemon/pokemon.entity.js';

// One row per user and Pokémon: the composite primary key makes marking a
// favorite twice a no-op.
@Entity()
export class Favorite {
  /** The anonymous UUID the client sends in X-User-Id. */
  @PrimaryColumn('text')
  userId: string;

  @PrimaryColumn('integer')
  pokemonId: number;

  // ON DELETE CASCADE: `npm run seed` empties the pokemon table, which also
  // deletes every favorite ("nuke and pave").
  // Relation<> keeps the circular import with Pokemon from breaking under ESM.
  @ManyToOne(() => Pokemon, (pokemon) => pokemon.favorites, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'pokemonId' })
  pokemon: Relation<Pokemon>;

  @CreateDateColumn()
  createdAt: Date;
}
