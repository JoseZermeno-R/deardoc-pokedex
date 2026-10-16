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
npm run dev
```

- API: http://localhost:3000
- Web: http://localhost:5173

## Scripts

Run from the repository root:

| Script              | What it does                                 |
| ------------------- | -------------------------------------------- |
| `npm run dev`       | Starts the API and the web app in watch mode |
| `npm run build`     | Builds both workspaces                       |
| `npm test`          | Runs the test suites                         |
| `npm run lint`      | Lints both workspaces with oxlint            |
| `npm run typecheck` | Type-checks both workspaces, tests included  |
| `npm run format`    | Formats the repository with Prettier         |

## Project structure

```
backend/    NestJS API (npm workspace)
frontend/   React app (npm workspace)
```
