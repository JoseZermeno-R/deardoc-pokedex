// Fetches every Pokémon species from PokeAPI once and writes the transformed
// snapshot to data/pokemon.json, which is committed and read by the seed.
// Run with `npm run data:fetch`. The app itself never calls PokeAPI.

import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as sleep } from 'node:timers/promises';
import type {
  PokemonSnapshot,
  PokemonStats,
  SnapshotPokemon,
} from '../src/pokemon/pokemon-snapshot.js';

const API_URL = 'https://pokeapi.co/api/v2';
const OUTPUT_FILE = new URL('../data/pokemon.json', import.meta.url);
const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 3;
const TIMEOUT_MS = 10_000;

// Only the PokeAPI fields this script reads.
interface NamedResource {
  name: string;
  url: string;
}

interface SpeciesListResponse {
  count: number;
  results: NamedResource[];
}

export interface SpeciesResponse {
  id: number;
  name: string;
  names: { name: string; language: NamedResource }[];
  genera: { genus: string; language: NamedResource }[];
  flavor_text_entries: { flavor_text: string; language: NamedResource }[];
  generation: NamedResource;
  is_legendary: boolean;
  is_mythical: boolean;
}

export interface PokemonResponse {
  id: number;
  height: number;
  weight: number;
  types: { slot: number; type: NamedResource }[];
  abilities: { slot: number; is_hidden: boolean; ability: NamedResource }[];
  stats: { base_stat: number; stat: NamedResource }[];
  sprites: { other: { 'official-artwork': { front_default: string | null } } };
}

const STAT_KEYS: Record<string, keyof PokemonStats> = {
  hp: 'hp',
  attack: 'attack',
  defense: 'defense',
  'special-attack': 'specialAttack',
  'special-defense': 'specialDefense',
  speed: 'speed',
};

const GENERATIONS = [
  'i',
  'ii',
  'iii',
  'iv',
  'v',
  'vi',
  'vii',
  'viii',
  'ix',
  'x',
];

function inEnglish<T extends { language: NamedResource }>(entries: T[]): T[] {
  return entries.filter((entry) => entry.language.name === 'en');
}

/**
 * Turns a PokeAPI flavor text (a Pokédex entry) into a one-line description:
 * the texts keep the line breaks and control characters of the original games.
 */
export function cleanDescription(text: string): string {
  return text
    .replace(/\u00ad\s+/g, '') // soft hyphen at a line break: the word continues
    .replace(/\s+/g, ' ') // \n, \f and repeated spaces
    .replace(/POKéMON/g, 'Pokémon')
    .trim();
}

/** `generation-ix` → 9 */
export function parseGeneration(name: string): number {
  const index = GENERATIONS.indexOf(name.replace('generation-', ''));
  if (index === -1) throw new Error(`Unknown generation: ${name}`);
  return index + 1;
}

/** Builds a snapshot record from a species and its default Pokémon. */
export function transform(
  species: SpeciesResponse,
  pokemon: PokemonResponse,
): SnapshotPokemon {
  const displayName = inEnglish(species.names)[0]?.name;
  const genus = inEnglish(species.genera)[0]?.genus;
  const image = pokemon.sprites.other['official-artwork'].front_default;
  if (!displayName || !genus || !image) {
    throw new Error(
      `Species ${species.name} is missing a name, genus or image`,
    );
  }

  const stats: Partial<PokemonStats> = {};
  for (const { base_stat, stat } of pokemon.stats) {
    const key = STAT_KEYS[stat.name];
    if (key) stats[key] = base_stat;
  }
  if (Object.keys(stats).length !== Object.keys(STAT_KEYS).length) {
    throw new Error(`Species ${species.name} is missing stats`);
  }

  // Flavor texts are listed from the oldest game to the newest.
  const latestFlavor = inEnglish(species.flavor_text_entries).at(-1);

  return {
    id: species.id,
    name: species.name,
    displayName,
    image,
    types: [...pokemon.types]
      .sort((a, b) => a.slot - b.slot)
      .map(({ type }) => type.name),
    heightM: pokemon.height / 10, // decimetres → metres
    weightKg: pokemon.weight / 10, // hectograms → kilograms
    abilities: [...pokemon.abilities]
      .sort((a, b) => a.slot - b.slot)
      .map(({ ability, is_hidden }) => ({
        name: ability.name,
        isHidden: is_hidden,
      })),
    stats: stats as PokemonStats,
    genus,
    description: latestFlavor
      ? cleanDescription(latestFlavor.flavor_text)
      : null,
    generation: parseGeneration(species.generation.name),
    isLegendary: species.is_legendary,
    isMythical: species.is_mythical,
  };
}

/** GET with a timeout, retrying network errors, timeouts, 429 and 5xx. */
async function fetchJson<T>(url: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (attempt > 1) await sleep(1000 * attempt);

    let response: Response;
    try {
      response = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    } catch (error) {
      lastError = error;
      continue;
    }

    if (response.ok) return (await response.json()) as T;
    lastError = new Error(`Responded ${response.status}`);
    if (response.status !== 429 && response.status < 500) break; // e.g. 404: retrying won't help
  }
  throw new Error(`GET ${url} failed`, { cause: lastError });
}

/** The species id is also the id of its default form: /pokemon/25 is Pikachu. */
async function fetchPokemon(id: number): Promise<SnapshotPokemon> {
  const [species, pokemon] = await Promise.all([
    fetchJson<SpeciesResponse>(`${API_URL}/pokemon-species/${id}`),
    fetchJson<PokemonResponse>(`${API_URL}/pokemon/${id}`),
  ]);
  return transform(species, pokemon);
}

async function main(): Promise<void> {
  const startedAt = Date.now();

  const list = await fetchJson<SpeciesListResponse>(
    `${API_URL}/pokemon-species?limit=2000`,
  );
  if (list.results.length !== list.count) {
    throw new Error(
      `Listed ${list.results.length} of ${list.count} species; raise the limit`,
    );
  }
  const ids = list.results.map(({ url }) => Number(url.split('/').at(-2)));

  // Everything is built in memory and written at the end, so a failure
  // never leaves a partial snapshot behind.
  const pokemon: SnapshotPokemon[] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    pokemon.push(...(await Promise.all(batch.map(fetchPokemon))));
    console.log(`Fetched ${pokemon.length}/${ids.length}`);
  }
  pokemon.sort((a, b) => a.id - b.id);

  const snapshot: PokemonSnapshot = {
    source: API_URL,
    generatedAt: new Date().toISOString(),
    count: pokemon.length,
    pokemon,
  };
  await mkdir(new URL('.', OUTPUT_FILE), { recursive: true });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(snapshot, null, 2)}\n`);

  const withoutDescription = pokemon.filter(
    (p) => p.description === null,
  ).length;
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `Wrote ${pokemon.length} Pokémon (${withoutDescription} without description) in ${seconds}s`,
  );
}

// Skipped when the tests import transform().
if (import.meta.main) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
