# Pokédex

A small fullstack Pokédex built for the DearDoc fullstack code challenge: browse Pokémon, search by name and mark favorites.

- **Backend:** NestJS REST API with SQLite (TypeORM). Pokémon data comes from a versioned snapshot of [PokeAPI](https://pokeapi.co/), so the app never calls PokeAPI at runtime.
- **Frontend:** React + Vite, React Router and TanStack Query, styled with CSS Modules.

## Requirements

- Node.js 22.22.3+ or 24.15+ (see `.nvmrc`). The Nest CLI's dependencies require it; older versions install with `EBADENGINE` warnings
- npm 10 or newer

No database server is needed: SQLite runs in-process.

## Getting started

```bash
npm install
npm run seed   # loads backend/data/pokemon.json into SQLite
npm run dev
```

- API: http://localhost:3000/api
- Web: http://localhost:5173

## Scripts

Run from the repository root:

| Script               | What it does                                                              |
| -------------------- | ------------------------------------------------------------------------- |
| `npm run dev`        | Starts the API and the web app in watch mode                              |
| `npm run seed`       | Replaces the `pokemon` table with the snapshot. **Deletes all favorites** |
| `npm run data:fetch` | Regenerates the snapshot from PokeAPI                                     |
| `npm run build`      | Builds both workspaces                                                    |
| `npm test`           | Runs the backend unit tests and the frontend tests                        |
| `npm run test:e2e`   | Runs the backend e2e tests, on an in-memory database                      |
| `npm run lint`       | Lints both workspaces with oxlint                                         |
| `npm run typecheck`  | Type-checks both workspaces, tests included                               |
| `npm run format`     | Formats the repository with Prettier                                      |

## Web app

The main view lists the Pokémon with their picture, number, name and types, inspired by the [official Pokédex](https://www.pokemon.com/us/pokedex).

- **Search by name** as you type (after a 300 ms pause, or right away with Enter). The search is kept in the URL (`/?search=pika`), so it can be shared and survives a reload.
- **Load more Pokémon** adds 24 at a time; the button disappears once all results are shown.
- **No results** shows the challenge's blank 404 page, with a button to clear the search. Unknown URLs show the same 404.
- **Responsive:** 2 columns on phones, 3 on tablets, 4 on laptops and 6 on large screens. All of them divide the 24 Pokémon loaded per click, so rows are always full.
- **Accessible:** a labeled search box, `alt` text on every picture, the result count announced to screen readers, real buttons, a visible keyboard focus, and type colors that meet WCAG AA contrast.

In development the browser only talks to Vite (`:5173`), which forwards `/api` to the backend (`:3000`). Both are on the same origin, so the backend needs no CORS configuration.

## API

All endpoints are under `/api`. Every response comes from the database; nothing calls PokeAPI at runtime.

| Method   | Path                            | Description                                                              |
| -------- | ------------------------------- | ------------------------------------------------------------------------ |
| `GET`    | `/pokemon?search=&page=&limit=` | Paginated list, ordered by id. `search` matches the name or display name |
| `GET`    | `/pokemon/:name`                | Detail by name, e.g. `/pokemon/mr-mime`                                  |
| `PUT`    | `/favorites/:pokemonId`         | Marks a favorite. Idempotent; `204`                                      |
| `DELETE` | `/favorites/:pokemonId`         | Unmarks a favorite. Idempotent; `204`                                    |

**User:** as the challenge suggests, there is no authorization system: the client generates a random UUID and the API authenticates the user with it, sent in the `X-User-Id` header. Each user only reads and changes their own favorites. The header is optional when reading (without it, `isFavorite` is always `false`) and required for `PUT` and `DELETE`. Anyone who knows a UUID can act as that user, which is fine for this challenge; a real deployment would take the user from a verified token instead.

**List parameters:** `page` defaults to 1 and `limit` to 24 (maximum 100). Invalid values respond `400`. A search with no matches responds `200` with an empty `items` array.

```bash
curl "http://localhost:3000/api/pokemon?search=pika&limit=2"
```

```json
{
  "items": [
    {
      "id": 25,
      "name": "pikachu",
      "displayName": "Pikachu",
      "image": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
      "types": ["electric"],
      "isFavorite": false
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 2
}
```

## Data

The app never calls PokeAPI at runtime. Getting the data and loading it are two separate steps:

1. **`npm run data:fetch`** (`backend/scripts/fetch-pokemon.ts`) requests the 1,025 species and their default forms from PokeAPI, 10 at a time, with timeouts and retries. It keeps only the fields the app uses, already converted (metres, kilograms, English names and descriptions), and writes `backend/data/pokemon.json`. The file is committed, so you don't need to run this.
2. **`npm run seed`** empties the `pokemon` table and inserts the snapshot in a single transaction. Running it again gives the same result.

> **`npm run seed` deletes every favorite** ("nuke and pave"). `favorites.pokemonId` is a foreign key to `pokemon.id` with `ON DELETE CASCADE`, so emptying the `pokemon` table empties `favorites` too. The database is local and disposable; reseeding resets it completely.

New Pokémon appear only after running `npm run data:fetch` and then `npm run seed`.

The database is `backend/data/pokedex.sqlite` (ignored by git); set `DATABASE_PATH` to use another file. Tables are created by TypeORM's `synchronize`, which is fine for a local database rebuilt from a snapshot; a real deployment would use migrations.

## Project structure

```
backend/    NestJS API (npm workspace)
  data/       pokemon.json snapshot and the local SQLite database
  scripts/    fetch-pokemon.ts, the PokeAPI snapshot script
frontend/   React app (npm workspace)
```
