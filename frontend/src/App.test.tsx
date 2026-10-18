import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PokemonDetail, PokemonListItem, PokemonPage } from './api/types';
import App from './App';

// 30 Pokémon: the first page shows 24, "Load more" adds the last 6.
const POKEMON: PokemonListItem[] = Array.from({ length: 30 }, (_, i) => ({
  id: i + 1,
  name: `pokemon-${i + 1}`,
  displayName: `Pokemon ${i + 1}`,
  image: `https://example.com/${i + 1}.png`,
  types: ['grass'],
  isFavorite: false,
}));
POKEMON[24] = {
  ...POKEMON[24],
  name: 'pikachu',
  displayName: 'Pikachu',
  types: ['electric'],
};

function toDetail(pokemon: PokemonListItem): PokemonDetail {
  return {
    ...pokemon,
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
    description: 'It stores electricity in its cheeks.',
    generation: 1,
    isLegendary: false,
    isMythical: false,
  };
}

/** The ids the fake server has stored as favorites. */
let favorites: Set<number>;

beforeEach(() => {
  favorites = new Set();
  localStorage.clear();
});

/** Behaves like the real API: list, detail and favorites. */
function fakeApi(input: RequestInfo | URL, init?: RequestInit): Response {
  const url = new URL(String(input), 'http://localhost');
  const method = init?.method ?? 'GET';
  const withFavorite = (p: PokemonListItem) => ({
    ...p,
    isFavorite: favorites.has(p.id),
  });

  const favorite = url.pathname.match(/^\/api\/favorites\/(\d+)$/);
  if (favorite) {
    const id = Number(favorite[1]);
    if (method === 'PUT') favorites.add(id);
    else favorites.delete(id);
    return new Response(null, { status: 204 });
  }

  const detail = url.pathname.match(/^\/api\/pokemon\/(.+)$/);
  if (detail) {
    const pokemon = POKEMON.find((p) => p.name === detail[1]);
    return pokemon
      ? Response.json(toDetail(withFavorite(pokemon)))
      : Response.json({ message: 'Not found' }, { status: 404 });
  }

  const search = (url.searchParams.get('search') ?? '').toLowerCase();
  const page = Number(url.searchParams.get('page'));
  const limit = Number(url.searchParams.get('limit'));
  const matches = POKEMON.filter(
    (p) =>
      p.name.includes(search) || p.displayName.toLowerCase().includes(search),
  );
  const body: PokemonPage = {
    items: matches.slice((page - 1) * limit, page * limit).map(withFavorite),
    total: matches.length,
    page,
    limit,
  };
  return Response.json(body);
}

function renderApp(path = '/') {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

type FakeFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Response | Promise<Response>;

function mockFetch(implementation: FakeFetch) {
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) =>
      implementation(input, init),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

afterEach(() => {
  // Testing Library only cleans up automatically when Vitest's globals are on.
  cleanup();
  vi.unstubAllGlobals();
});

describe('Pokédex list', () => {
  it('shows the first 24 Pokémon with number, name and types', async () => {
    mockFetch(fakeApi);
    renderApp();

    expect(await screen.findAllByRole('article')).toHaveLength(24);
    expect(screen.getByText('Showing 24 of 30 Pokémon')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'Pokemon 1' })).toBeDefined();
    expect(screen.getByText('#0001')).toBeDefined();
    expect(screen.getByRole('img', { name: 'Pokemon 1' })).toBeDefined();
    expect(screen.getAllByText('grass').length).toBeGreaterThan(0);
  });

  it('loads the next 24 with "Load more" and hides the button when all are shown', async () => {
    const fetchMock = mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp();

    await user.click(
      await screen.findByRole('button', { name: 'Load more Pokémon' }),
    );

    await waitFor(() =>
      expect(screen.getAllByRole('article')).toHaveLength(30),
    );
    expect(screen.getByText('Showing 30 of 30 Pokémon')).toBeDefined();
    expect(
      screen.queryByRole('button', { name: 'Load more Pokémon' }),
    ).toBeNull();
    expect(String(fetchMock.mock.calls[1][0])).toContain('page=2');
  });
});

describe('Search', () => {
  it('filters by name after the user stops typing', async () => {
    const fetchMock = mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp();
    await screen.findAllByRole('article');

    await user.type(screen.getByLabelText('Search by name'), 'pika');

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(1));
    expect(screen.getByRole('heading', { name: 'Pikachu' })).toBeDefined();
    // Debounced: one request for the whole word, not one per letter.
    const searches = fetchMock.mock.calls
      .map(([url]) => String(url))
      .filter((u) => u.includes('search='));
    expect(searches).toEqual(['/api/pokemon?search=pika&page=1&limit=24']);
  });

  it('reads the search from the URL', async () => {
    mockFetch(fakeApi);
    renderApp('/?search=pikachu');

    expect(
      await screen.findByRole('heading', { name: 'Pikachu' }),
    ).toBeDefined();
    expect(
      (screen.getByLabelText('Search by name') as HTMLInputElement).value,
    ).toBe('pikachu');
  });

  it('shows the 404 page when nothing matches, and "Clear search" goes back to the list', async () => {
    mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp('/?search=zzz');

    expect(await screen.findByText('404')).toBeDefined();
    expect(screen.getByText('No Pokémon match “zzz”.')).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Clear search' }));

    expect(await screen.findAllByRole('article')).toHaveLength(24);
    expect(
      (screen.getByLabelText('Search by name') as HTMLInputElement).value,
    ).toBe('');
  });
});

describe('Favorites', () => {
  const favoriteButton = () =>
    screen.getByRole('button', { name: 'Favorite Pikachu' });

  it('sends the same X-User-Id with every request', async () => {
    const fetchMock = mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp();
    await user.click(
      await screen.findByRole('button', { name: 'Load more Pokémon' }),
    );
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));

    const userIds = fetchMock.mock.calls.map(
      ([, init]) =>
        (init?.headers as Record<string, string> | undefined)?.['X-User-Id'],
    );
    expect(new Set(userIds).size).toBe(1);
    expect(userIds[0]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('marks a favorite right away, then sends PUT; a second click sends DELETE', async () => {
    let finishPut: () => void = () => {};
    const fetchMock = mockFetch((input, init) =>
      init?.method === 'PUT'
        ? new Promise((resolve) => {
            finishPut = () => resolve(fakeApi(input, init));
          })
        : fakeApi(input, init),
    );
    const user = userEvent.setup();
    renderApp('/?search=pikachu');
    await screen.findByRole('heading', { name: 'Pikachu' });
    expect(favoriteButton().getAttribute('aria-pressed')).toBe('false');

    await user.click(favoriteButton());

    // Optimistic: pressed before the server answers.
    expect(favoriteButton().getAttribute('aria-pressed')).toBe('true');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/favorites/25',
      expect.objectContaining({ method: 'PUT' }),
    );
    finishPut();
    await waitFor(() => expect(favorites.has(25)).toBe(true));

    await user.click(favoriteButton());

    expect(favoriteButton().getAttribute('aria-pressed')).toBe('false');
    await waitFor(() => expect(favorites.has(25)).toBe(false));
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/favorites/25',
      expect.objectContaining({ method: 'DELETE' }),
    );
  });

  it('reverts and shows a message when the request fails', async () => {
    mockFetch((input, init) =>
      init?.method === 'PUT'
        ? new Response(null, { status: 500 })
        : fakeApi(input, init),
    );
    const user = userEvent.setup();
    renderApp('/?search=pikachu');
    await screen.findByRole('heading', { name: 'Pikachu' });

    await user.click(favoriteButton());

    expect(
      await screen.findByText("Couldn't update Pikachu. Try again."),
    ).toBeDefined();
    expect(favoriteButton().getAttribute('aria-pressed')).toBe('false');
  });
});

describe('Detail page', () => {
  it('opens from a card and shows the Pokémon', async () => {
    mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp('/?search=pikachu');

    await user.click(await screen.findByRole('link', { name: 'Pikachu' }));

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Pikachu #0025' }),
    ).toBeDefined();
    expect(screen.getByText(/Mouse Pokémon · Generation I/)).toBeDefined();
    expect(
      screen.getByText('It stores electricity in its cheeks.'),
    ).toBeDefined();
    // Hidden abilities aren't listed, as in the official Pokédex.
    expect(screen.getByText('Static')).toBeDefined();
    expect(screen.queryByText('Lightning Rod')).toBeNull();
    expect(screen.getByText('Speed').nextElementSibling?.textContent).toBe(
      '90',
    );
  });

  it('shows the favorite state and lets the user change it', async () => {
    favorites.add(25);
    mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp('/pokemon/pikachu');

    const button = await screen.findByRole('button', {
      name: 'Favorite Pikachu',
    });
    expect(button.getAttribute('aria-pressed')).toBe('true');

    await user.click(button);

    expect(button.getAttribute('aria-pressed')).toBe('false');
    await waitFor(() => expect(favorites.has(25)).toBe(false));
  });

  it('shows the 404 page for an unknown name, with a link back to the list', async () => {
    mockFetch(fakeApi);
    const user = userEvent.setup();
    renderApp('/pokemon/missingno');

    expect(
      await screen.findByText("There's no Pokémon called “missingno”."),
    ).toBeDefined();

    await user.click(
      screen.getByRole('link', { name: 'Explore more Pokémon' }),
    );

    expect(await screen.findAllByRole('article')).toHaveLength(24);
  });
});

describe('Errors and unknown pages', () => {
  it('shows an error with "Try again" when the API fails', async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 500 }));
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText("Couldn't load Pokémon.")).toBeDefined();

    fetchMock.mockImplementation(async (input, init) => fakeApi(input, init));
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findAllByRole('article')).toHaveLength(24);
  });

  it('shows the 404 page for an unknown URL', async () => {
    mockFetch(fakeApi);
    renderApp('/not-a-page');

    expect(screen.getByText('404')).toBeDefined();
    expect(
      screen.getByRole('link', { name: 'Back to the Pokédex' }),
    ).toBeDefined();
  });
});
