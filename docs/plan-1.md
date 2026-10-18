# Phase 1 plan: data

Goal: get the Pokémon from PokeAPI **once** with a script that saves a JSON versioned in the repo, and fill the database with a **manual** seed that reads that JSON. The backend never calls PokeAPI at runtime.

## Decisions

| Topic           | Decision                                                                                               | Why                                                                                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Script language | **TypeScript**, not Python                                                                             | It shares the JSON's type with the seed (a single contract), a single test stack (Vitest), and it's the piece closest to the role (integrations in TS) |
| Script runner   | **`tsx`** (devDependency)                                                                              | Allows the same `.js` imports as the rest of the backend (`nodenext`). The script uses no decorators                                                   |
| Seed runner     | **`nest start --entryFile seed`**                                                                      | Reuses the app's TypeORM configuration. `tsx` (esbuild) doesn't emit decorator metadata and would break Nest's dependency injection                    |
| Seed            | **Manual** (`npm run seed`): empties the `pokemon` table and inserts the whole JSON in one transaction | Nothing syncs when the project starts                                                                                                                  |
| Schema          | **`synchronize: true`**                                                                                | The SQLite is local and rebuilt from the JSON. In production I'd use migrations (document it)                                                          |
| Tests           | **In this phase:** `transform` with real fixtures and the seed run twice                               | They validate the data before generating the JSON                                                                                                      |

## Verified before implementing (October 16, 2026)

- TypeORM **1.1.x** with `@nestjs/typeorm@12` (supports Nest 12).
- TypeORM requires `better-sqlite3@^12`, but the latest is 13: **pin 12**. 12.11.1 installs from a prebuilt binary on Windows with Node 24.20.
- Test in a separate directory: `simple-json` returns the arrays as they are, a repeated upsert doesn't duplicate, and `LIKE` is case-insensitive.
- PokeAPI: 1,025 species (the last one is `pecharunt`). The edge cases (`Nidoran♀`, `Mr. Mime`, `Deoxys`, `Giratina`, `Flabébé`, `Type: Null`, `Enamorus`, Gen IX) have official artwork, a `genus` and an English description.

## Structure

```
backend/
  scripts/
    fetch-pokemon.ts          → npm run data:fetch (a single file; exports transform for the tests)
    fetch-pokemon.spec.ts
    __fixtures__/             → real trimmed responses (pikachu, deoxys, mr-mime)
  data/
    pokemon.json              → versioned (in .prettierignore)
    pokedex.sqlite            → ignored by git
  src/
    pokemon/
      pokemon-snapshot.ts     → the JSON's types: the contract between the script (writes) and the seed (reads)
      pokemon.entity.ts
      pokemon.module.ts
      seed.service.ts
      seed.service.spec.ts
    seed.ts                   → entry point of npm run seed
```

## The `data:fetch` script

1. `GET /pokemon-species?limit=2000` to get the IDs.
2. In **batches of 10 with `Promise.all`**: `/pokemon-species/{id}` and `/pokemon/{id}` for each ID.
3. `transform` builds each record.
4. Validation: the count matches the list, and each record has a picture, at least one type and the 6 stats.
5. Sort by `id`, add metadata (`source`, `generatedAt`, `count`) and write the file **at the end**.

Robustness, without overcomplicating it:

- A **timeout** of 10 s per request (`AbortSignal.timeout`).
- **Retries:** up to 3 attempts with a wait, only on network errors, `429` and `5xx`. A `404` fails right away.
- **All or nothing:** everything is built in memory and written at the end. If something fails before, the previous JSON stays untouched.
- A summary at the end: how many Pokémon, how many without a description, and how long it took.

Transformation:

- `name`, `displayName`, `genus`, `description`, `generation`, `isLegendary` and `isMythical` come from the **species**; `image`, `types`, `heightM`, `weightKg`, `abilities` and `stats` come from the **Pokémon**.
- `description`: the last English entry in the array, or `null` if there is none. `\n`, `\f` and the soft hyphen (`\u00ad`) are cleaned.
- `generation`: `"generation-ix"` → `9`.
- Only the PokeAPI fields that are used are typed, not the full response.

## Database and seed

- `Pokemon` entity:
  - `id` as the PK without autoincrement (it comes from PokeAPI); `name` unique.
  - `displayName`, `image`, `heightM`, `weightKg`, `genus`, `description` (nullable), `generation`, `isLegendary` and `isMythical`.
  - `types`, `abilities` and `stats` as `simple-json`.
- `TypeOrmModule.forRoot` with `better-sqlite3`, `autoLoadEntities` and `synchronize: true`. The database lives in `data/pokedex.sqlite`, overridable with `DATABASE_PATH`; the tests use `:memory:`.
- `SeedService.seed()`: reads the JSON and, in one transaction, empties `pokemon` and inserts in batches. If something fails, the table stays as it was.
- **Note for phase 2:** the seed doesn't touch `favorites`. That table has to be designed so that emptying `pokemon` neither breaks nor deletes the favorites. (Phase 2 chose the opposite: a foreign key with `ON DELETE CASCADE`, so the seed deletes every favorite; see [plan-2.md](plan-2.md).)

## Tooling

- The backend's `lint`: add `scripts/`.
- `.prettierignore`: add `backend/data/pokemon.json`.
- Root scripts: `data:fetch` and `seed`, pointing to the backend workspace.
- README: `npm install` → `npm run seed` → `npm run dev`, and a note about `better-sqlite3`'s `warn install-scripts`.
