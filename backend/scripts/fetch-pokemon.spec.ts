import { readFileSync } from 'node:fs';
import {
  cleanDescription,
  parseGeneration,
  transform,
  type PokemonResponse,
  type SpeciesResponse,
} from './fetch-pokemon.js';

// Real PokeAPI responses trimmed to the fields transform() reads.
function loadFixture(name: string): {
  species: SpeciesResponse;
  pokemon: PokemonResponse;
} {
  const file = new URL(`./__fixtures__/${name}.json`, import.meta.url);
  return JSON.parse(readFileSync(file, 'utf8'));
}

describe('transform', () => {
  it('maps Pikachu to a snapshot record', () => {
    const { species, pokemon } = loadFixture('pikachu');

    expect(transform(species, pokemon)).toEqual({
      id: 25,
      name: 'pikachu',
      displayName: 'Pikachu',
      image:
        'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
      types: ['electric'],
      heightM: 0.4,
      weightKg: 6,
      abilities: [
        { name: 'static', isHidden: false },
        { name: 'lightning-rod', isHidden: true },
      ],
      stats: {
        hp: 35,
        attack: 55,
        defense: 40,
        specialAttack: 50,
        specialDefense: 50,
        speed: 90,
      },
      genus: 'Mouse Pokémon',
      description: expect.stringMatching(/^Possesses cheek sacs/),
      generation: 1,
      isLegendary: false,
      isMythical: false,
    });
  });

  it('takes the names from the species, not from the default form', () => {
    const deoxys = loadFixture('deoxys');
    const mrMime = loadFixture('mr-mime');

    // The default form of Deoxys is called deoxys-normal.
    expect(transform(deoxys.species, deoxys.pokemon)).toMatchObject({
      name: 'deoxys',
      displayName: 'Deoxys',
      isMythical: true,
    });
    expect(transform(mrMime.species, mrMime.pokemon)).toMatchObject({
      name: 'mr-mime',
      displayName: 'Mr. Mime',
    });
  });

  it('uses the latest English description even when other languages come after it', () => {
    const { species, pokemon } = loadFixture('deoxys');
    expect(species.flavor_text_entries.at(-1)?.language.name).toBe('ja');

    const { description } = transform(species, pokemon);

    expect(description).toMatch(/^Deoxys emerged from a virus/);
    expect(description).not.toMatch(/\n/);
  });

  it('sets the description to null when there is no English entry', () => {
    const { species, pokemon } = loadFixture('pikachu');
    species.flavor_text_entries = species.flavor_text_entries.filter(
      (entry) => entry.language.name !== 'en',
    );

    expect(transform(species, pokemon).description).toBeNull();
  });

  it('orders types and abilities by slot', () => {
    const { species, pokemon } = loadFixture('mr-mime');
    pokemon.types.reverse();
    pokemon.abilities.reverse();

    const result = transform(species, pokemon);

    expect(result.types).toEqual(['psychic', 'fairy']);
    expect(result.abilities.map((ability) => ability.name)).toEqual([
      'soundproof',
      'filter',
      'technician',
    ]);
  });

  it('throws when the official artwork is missing', () => {
    const { species, pokemon } = loadFixture('pikachu');
    pokemon.sprites.other['official-artwork'].front_default = null;

    expect(() => transform(species, pokemon)).toThrow(
      /missing a name, genus or image/,
    );
  });

  it('throws when a stat is missing', () => {
    const { species, pokemon } = loadFixture('pikachu');
    pokemon.stats = pokemon.stats.filter(({ stat }) => stat.name !== 'speed');

    expect(() => transform(species, pokemon)).toThrow(/missing stats/);
  });
});

describe('cleanDescription', () => {
  it('removes the line breaks and form feeds of the original games', () => {
    expect(
      cleanDescription(
        'When several of\nthese POKéMON\ngather, their\felectricity',
      ),
    ).toBe('When several of these Pokémon gather, their electricity');
  });

  it('joins words split with a soft hyphen at a line break', () => {
    expect(cleanDescription('it gener\u00ad\nates electricity')).toBe(
      'it generates electricity',
    );
  });
});

describe('parseGeneration', () => {
  it('converts the roman numeral to a number', () => {
    expect(parseGeneration('generation-i')).toBe(1);
    expect(parseGeneration('generation-iv')).toBe(4);
    expect(parseGeneration('generation-ix')).toBe(9);
  });

  it('throws on an unknown generation', () => {
    expect(() => parseGeneration('generation-xx')).toThrow(
      /Unknown generation/,
    );
  });
});
