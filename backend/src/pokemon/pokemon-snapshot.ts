// Shape of data/pokemon.json: written by scripts/fetch-pokemon.ts and read by
// the seed. Values are stored ready to use, so nothing is converted at runtime.

export interface PokemonStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export interface PokemonAbility {
  name: string;
  isHidden: boolean;
}

export interface SnapshotPokemon {
  id: number;
  /** Species slug, e.g. `mr-mime`. Used in URLs and search. */
  name: string;
  /** English display name, e.g. `Mr. Mime`. */
  displayName: string;
  image: string;
  /** Ordered by slot: the primary type comes first. */
  types: string[];
  heightM: number;
  weightKg: number;
  abilities: PokemonAbility[];
  stats: PokemonStats;
  genus: string;
  description: string | null;
  generation: number;
  isLegendary: boolean;
  isMythical: boolean;
}

export interface PokemonSnapshot {
  source: string;
  generatedAt: string;
  count: number;
  pokemon: SnapshotPokemon[];
}
