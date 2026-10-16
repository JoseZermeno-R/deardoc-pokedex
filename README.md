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

- API: http://localhost:3000
- Web: http://localhost:5173

## Scripts

Run from the repository root:

| Script               | What it does                                   |
| -------------------- | ---------------------------------------------- |
| `npm run dev`        | Starts the API and the web app in watch mode   |
| `npm run seed`       | Replaces the `pokemon` table with the snapshot |
| `npm run data:fetch` | Regenerates the snapshot from PokeAPI          |
| `npm run build`      | Builds both workspaces                         |
| `npm test`           | Runs the test suites                           |
| `npm run lint`       | Lints both workspaces with oxlint              |
| `npm run typecheck`  | Type-checks both workspaces, tests included    |
| `npm run format`     | Formats the repository with Prettier           |

## Data

The app never calls PokeAPI at runtime. Getting the data and loading it are two separate steps:

1. **`npm run data:fetch`** (`backend/scripts/fetch-pokemon.ts`) requests the 1,025 species and their default forms from PokeAPI, 10 at a time, with timeouts and retries. It keeps only the fields the app uses, already converted (metres, kilograms, English names and descriptions), and writes `backend/data/pokemon.json`. The file is committed, so you don't need to run this.
2. **`npm run seed`** empties the `pokemon` table and inserts the snapshot in a single transaction. Running it again gives the same result.

New Pokémon appear only after running `npm run data:fetch` and then `npm run seed`.

The database is `backend/data/pokedex.sqlite` (ignored by git); set `DATABASE_PATH` to use another file. Tables are created by TypeORM's `synchronize`, which is fine for a local database rebuilt from a snapshot; a real deployment would use migrations.

## Project structure

```
backend/    NestJS API (npm workspace)
  data/       pokemon.json snapshot and the local SQLite database
  scripts/    fetch-pokemon.ts, the PokeAPI snapshot script
frontend/   React app (npm workspace)
```
