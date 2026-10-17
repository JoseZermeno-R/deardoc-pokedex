import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PokemonListItem, PokemonPage } from './api/types';
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

/** Filters and paginates like GET /api/pokemon. */
function fakeApi(input: RequestInfo | URL): Response {
  const url = new URL(String(input), 'http://localhost');
  const search = (url.searchParams.get('search') ?? '').toLowerCase();
  const page = Number(url.searchParams.get('page'));
  const limit = Number(url.searchParams.get('limit'));
  const matches = POKEMON.filter(
    (p) =>
      p.name.includes(search) || p.displayName.toLowerCase().includes(search),
  );
  const body: PokemonPage = {
    items: matches.slice((page - 1) * limit, page * limit),
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

function mockFetch(implementation: (input: RequestInfo | URL) => Response) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL) =>
    implementation(input),
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

describe('Errors and unknown pages', () => {
  it('shows an error with "Try again" when the API fails', async () => {
    const fetchMock = mockFetch(() => new Response(null, { status: 500 }));
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByText("Couldn't load Pokémon.")).toBeDefined();

    fetchMock.mockImplementation(async (input) => fakeApi(input));
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
