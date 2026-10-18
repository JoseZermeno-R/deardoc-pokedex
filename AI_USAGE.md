# AI usage

## Tools

| Tool                      | Version                             |
| ------------------------- | ----------------------------------- |
| Claude Code (desktop app) | Claude Opus 5.5 (`claude-opus-5-5`) |

Used for exploring PokeAPI, planning, UI mockups, scaffolding, writing the code and tests.

## Prompts and iterations

### 1–2. Scouting and planning session

- Asked Claude to explore the PokeAPI endpoints live (response shapes, sizes, the 1,351 vs. 1,025 Pokémon counts) and to propose the shape of the transformed snapshot.
- Iterated on the data strategy.
- Asked Claude to read the challenge README and the scouting notes to get context.
- Claude flagged that the species endpoint is required, not optional, because `name` and `displayName` come from it, and verified the `names` field live (`Mr. Mime`, and `Deoxys` instead of `deoxys-normal`).
- Claude presented each pending decision as options with a recommendation.
- Check [docs/scouting.md](docs/scouting.md) for the final scouting output.

### 3. Phase 0: setup

- Asked Claude to scaffold the monorepo according to the stack defined in scouting.md. Initially I asked for classic pagination, which evolved later on. The detail must be a page, not a modal. Types, abilities and stats are `simple-json` columns. Keep CSS Modules. Save the plan at docs/plan-0.md to record this effort.
- Claude scaffolded both apps with the official generators (`@nestjs/cli new`, `create-vite --template react-ts`) instead of writing them by hand, then trimmed the template leftovers.
- Check [docs/plan-0.md](docs/plan-0.md) for the final plan output.

### 4. Phase 1: data

- Asked Claude to re-read scouting.md to get previous decisions and start the planning.
- Before planning, Claude checked the libraries and the API live:
  - TypeORM is now 1.x and `@nestjs/typeorm@12` supports it.
  - TypeORM requires `better-sqlite3@^12`, while the latest is 13.
  - In a throwaway project, `better-sqlite3@12` installed from a prebuilt binary on Windows, and `simple-json`, a repeated upsert and `LIKE` behaved as expected.
  - 14 edge-case species (`Nidoran♀`, `Mr. Mime`, `Type: Null`, `Flabébé`, Gen IX…) all had artwork, a genus and an English description.
- Claude's first plan had a four-file script (HTTP client, concurrency pool, transform, entry point), exponential backoff with jitter, atomic writes, and a seed that upserted on every startup. I pushed back, arguing that we were overcomplicating things. The database doesn’t need to sync when the project starts; a Python script could be responsible for creating the JSON, and the seed should delete whatever data is there and keep only what comes from the JSON.
- Claude agreed on the manual seed but argued against using Python, and simplified the TypeScript script instead. I accepted.
- Follow-up question while reviewing: whether deleting `pokedex.sqlite` and running `npm run seed` rebuilds it (I tested it, and Claude validated the result).
- Check [docs/plan-1.md](docs/plan-1.md) for the final plan output.

### 5. Phase 2: backend endpoints

- I asked Claude for a proposal to structure the endpoints around our needs: a list with search and pagination, a detail view, and favorites.
- Before planning, Claude checked Nest 12's pipes: `ParseUUIDPipe` accepts `optional: true`, `ParseIntPipe` has no min/max, and `class-validator` 0.15 is compatible.
- Claude presented some decisions and I pushed back on two:
  - On computing `isFavorite` with two simple queries instead of a LEFT JOIN. Claude had claimed a LEFT JOIN forced `getRawMany()` and untyped rows. When asked to back it up, it corrected itself.
  - On the foreign key, Claude recommended none so favorites would survive a reseed. I chose the FK, accepting that reseeding deletes every favorite ("nuke and pave").
- Claude tested both choices in a throwaway project before writing the plan.
- Design questions before implementing:
  - Why `PUT` and `DELETE`, and what the best practices are for a like-style value. Claude compared them with `POST`, a toggle endpoint and `PATCH`, with examples from GitHub's and Spotify's APIs.
  - What happens if the user double-clicks the favorite button. Claude pointed out the real risk: the `PUT` and the `DELETE` can arrive out of order and leave the UI and the server out of sync. The fix belongs to the frontend (serial mutations with TanStack Query's `scope`, plus revalidation), noted for phase 4.
- Check [docs/plan-2.md](docs/plan-2.md) for the final plan output.

### 6. Phase 3: frontend, list and search

- I asked Claude to propose some mockups for this screen, using https://www.pokemon.com/us/pokedex as a reference.
  I asked it to use a “Load more Pokémon” button instead of infinite scroll or pagination, since that’s how the reference page does it.
  I also pointed out that we would search by name only (searching by Pokémon number is left for later).
  Finally, I asked it to keep the view responsive and account for different resolutions: phones, tablets, monitors and large screens.
- Claude reviewed the official Pokédex in a browser, checked the current library versions (React Router is now 8), and drew two visual proposals, each in desktop, tablet and phone sizes, plus the loading, empty and error states.
- Claude presented decisions and recommendations. Claude recommended copying the API types into the frontend; I chose importing them from the backend instead. Claude then checked that it builds before writing the plan.
- Check [docs/plan-3.md](docs/plan-3.md) for the final plan output.

### 7. Phase 4: favorites and detail

- Here I again asked Claude to analyze the reference page for the detail view (https://www.pokemon.com/us/pokedex/bulbasaur) and, keeping the look and feel of our main page, to provide mockups with these constraints: no previous/next navigation; keep the “Explore more Pokémon” behavior that takes you back to the main page; leave out evolutions, trading cards and weaknesses for now, sticking to the data our detail endpoint returns; and make it a separate page reachable by URL, not a modal.
- Claude reviewed the official detail page in a browser, checked the real ranges in our data (stats from 1 to 255, up to 3 abilities, descriptions up to 216 characters), and drew the cards with a favorite button, two detail layouts in desktop and phone sizes, and the detail's loading, not-found and error states.
- Check [docs/plan-4.md](docs/plan-4.md) for the final plan output.

## Technical decisions

**Who** says whether the decision was mine or suggested by the AI.

| Decision                                                                                                                                                                         | Who                                         | Why                                                                                                                                                                                                                      |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Snapshot JSON + seed: a script fetches PokeAPI once and writes a versioned JSON; the seed only inserts it                                                                        | **Me**                                      | Claude first proposed seeding straight from PokeAPI or an in-memory cache. Splitting fetch from insert makes setup fast, deterministic and independent of PokeAPI's availability                                         |
| Only the 1,025 default forms, listed through `/pokemon-species`                                                                                                                  | AI suggested, I agreed                      | Behaves like a real Pokédex (one entry per species) instead of 17 results for "pikachu"                                                                                                                                  |
| Transformed fields (names from the species, units converted, `stats` as an object)                                                                                               | AI suggested, I agreed                      | The JSON is the data model; the backend does no conversion at runtime                                                                                                                                                    |
| React + NestJS + SQLite                                                                                                                                                          | **Me**                                      | My strongest stack; SQLite needs no install for reviewers.                                                                                                                                                               |
| npm workspaces with `concurrently`                                                                                                                                               | Me, from AI-presented options               | One `npm install` and one `npm run dev`                                                                                                                                                                                  |
| One `pokemon` table with `simple-json` columns + a `favorites` table                                                                                                             | **Me**                                      | Enough for search and pagination; filtering by type in SQL is a "with more time" item                                                                                                                                    |
| Classic pagination with state in the URL (later replaced by "Load more", see below)                                                                                              | Me, from AI-presented options               | Accessible, testable, shareable URLs, back button works                                                                                                                                                                  |
| Detail as its own page (`/pokemon/:name`)                                                                                                                                        | **Me**                                      | Own URL, no focus trap to manage                                                                                                                                                                                         |
| Vite + React Router + TanStack Query, no global state library                                                                                                                    | Me, from AI-presented options               | Query covers server cache, loading/error states and optimistic favorites                                                                                                                                                 |
| CSS Modules                                                                                                                                                                      | **Me**                                      | Built into Vite, no extra dependencies                                                                                                                                                                                   |
| Keep the generators' defaults: Vitest and oxlint (both apps), ESM in Nest 12                                                                                                     | **Me**                                      | Current defaults of the official tooling; one test runner for both workspaces                                                                                                                                            |
| Manual seed only (`npm run seed`): empties the `pokemon` table and inserts the JSON in one transaction; nothing syncs at startup                                                 | **Me**                                      | Claude proposed upserting on every startup. A manual step is simpler to explain, and the transaction leaves the previous data untouched if anything fails                                                                |
| Fetch script in TypeScript, not Python                                                                                                                                           | I asked, AI argued against Python, I agreed | One type (`SnapshotPokemon`) is the contract between the script that writes the JSON and the seed that reads it; one test stack; and it is the piece closest to the role (integrations in TypeScript)                    |
| Simplified script: one file, batches of 10 with `Promise.all`, up to 3 attempts, write at the end                                                                                | Me asked to simplify, AI proposed how       | Easier to read. Building everything in memory and writing at the end keeps it all-or-nothing without a temp file                                                                                                         |
| `synchronize: true` instead of migrations                                                                                                                                        | Me, from AI-presented options               | A local SQLite rebuilt from the snapshot; a real deployment would use migrations                                                                                                                                         |
| Tests in this phase: `transform` with real fixtures and the seed against an in-memory database                                                                                   | Me, from AI-presented options               | They check the data before generating the JSON                                                                                                                                                                           |
| `better-sqlite3` pinned to 12, and its install script (and `esbuild`'s) approved in `allowScripts`                                                                               | AI                                          | TypeORM 1.x requires `better-sqlite3@^12`. npm 11 warns about install scripts that are not explicitly approved                                                                                                           |
| Validate the list's query string with a `class-validator` DTO and a global `ValidationPipe`                                                                                      | **Me**                                      | Idiomatic Nest: the rules (`@IsInt() @Min(1) @Max(100)`) are declarative and in one place                                                                                                                                |
| No `GET /api/favorites`                                                                                                                                                          | **Me**                                      | The challenge only asks to mark and show favorites; `isFavorite` in the list and the detail covers it                                                                                                                    |
| `isFavorite` with a LEFT JOIN (`leftJoinAndSelect` on the `Pokemon.favorites` relation)                                                                                          | **Me**                                      | Claude recommended two simple queries. Typed entities, and the same number of queries as the alternative (TypeORM runs 3 either way with `skip`/`take`)                                                                  |
| Foreign key with `ON DELETE CASCADE`: `npm run seed` deletes every favorite ("nuke and pave")                                                                                    | **Me**                                      | Claude recommended no FK so favorites would survive a reseed. The database guarantees integrity, and the local database is disposable; the trade-off is documented in the README                                         |
| `PUT` and `DELETE` on the favorite, both idempotent (`204`)                                                                                                                      | AI suggested in the scouting, I agreed      | The client sends the state it wants, so retries and repeated clicks leave the same result; the composite primary key and `INSERT OR IGNORE` back it up                                                                   |
| Anonymous user as a UUID in the `X-User-Id` header: optional when reading, required when writing                                                                                 | AI suggested, I agreed                      | The challenge's recommendation: no authorization system, and a random client-side UUID to authenticate the user. Without the header, `isFavorite` is simply `false`                                                      |
| A "Load more Pokémon" button instead of classic pagination or infinite scroll; only the search is kept in the URL                                                                | **Me**                                      | What the official Pokédex does, and simpler than infinite scroll. It changes the planning session's decision (classic pagination with `?page=` in the URL). The backend didn't change: each click asks for the next page |
| Visual proposal A: the official layout (search band, picture on a gray tile, number, name and type pills)                                                                        | Me, from AI-presented mockups               | Closest to the inspiration the challenge suggests. Proposal B (red header, bordered cards) was dropped                                                                                                                   |
| Search while typing, after a 300 ms pause; Enter searches right away                                                                                                             | **Me**                                      | Feels immediate without a request per keystroke                                                                                                                                                                          |
| Import the API types from the backend through a single `frontend/src/api/types.ts`                                                                                               | **Me**                                      | Claude recommended copying them. One source of truth for the contract; Claude checked that `tsc -b`, `vite build` and oxlint accept the import. The backend's type files must stay type-only                             |
| Frontend tests in this phase: Vitest, React Testing Library and jsdom, with a fake `fetch`                                                                                       | Me, from AI-presented options               | Same as phases 1 and 2                                                                                                                                                                                                   |
| 24 Pokémon per click (the official site loads 12)                                                                                                                                | AI                                          | 24 fills complete rows in the 2, 3, 4 and 6 column layouts                                                                                                                                                               |
| Type colors: the official backgrounds, with text in the same hue darkened to WCAG AA                                                                                             | AI                                          | The official white text fails AA on 16 of 18 types. For dark and ghost no darker shade reaches 4.5:1, so they keep white text                                                                                            |
| TanStack Query `useInfiniteQuery`, with a 5-minute `staleTime` and no refetch on window focus                                                                                    | AI                                          | The data is a static snapshot, so cached pages stay valid and going back to a search reuses them                                                                                                                         |
| Light theme only                                                                                                                                                                 | **Me**                                      | Keeps the scope small; dark mode is a "with more time" item                                                                                                                                                              |
| Detail page only shows what the detail endpoint returns: no previous/next, evolutions, weaknesses, gender or cards                                                               | **Me**                                      | Keeps the page to the data we have; the rest needs data or endpoints we don't have                                                                                                                                       |
| Detail layout A: two columns like the official page, one column in reading order on phones                                                                                       | Me, from AI-presented mockups               | Consistent with the list (the same picture on a gray tile). Layout B (picture inside the dark band) was dropped                                                                                                          |
| Favorite button on every card and on the detail page                                                                                                                             | **Me**                                      | The challenge allows it in the main view, and users don't have to open each Pokémon                                                                                                                                      |
| "Explore more Pokémon" is a fixed link to the list from the start                                                                                                                | **Me**                                      | Claude recommended returning to the list as it was left. Same as the official site; the browser's back button still keeps the search and the loaded pages                                                                |
| A failed favorite reverts and shows a short message                                                                                                                              | Me, from AI-presented options               | Without the message, the heart would "unmark itself" with no explanation                                                                                                                                                 |
| Stats shown as numbers with horizontal bars on a 0–255 scale                                                                                                                     | AI                                          | The official 15-segment bars hide the value and say nothing to screen readers; 255 is the highest stat in the data                                                                                                       |
| User id: stored in `localStorage`, validated on every read, with an in-memory fallback and a UUID built from `crypto.getRandomValues()` when `crypto.randomUUID()` doesn't exist | AI, after my question about it              | An edited value would make every request fail with 400; blocked storage shouldn't break the app; and `randomUUID` only exists in secure contexts, so the app would break when opened by IP                               |
| Optimistic updates in every cached list and detail; requests for the same Pokémon run in series (`scope`); caches marked stale without refetching (`refetchType: 'none'`)        | AI                                          | The heart reacts at once, a double click can't reach the server out of order, and a click doesn't reload every "Load more" page                                                                                          |

## Verification

- Reviewed every generated file before keeping it, and did a manual visual regression check each time.

### Phase 0

- Made `strict` explicit in the frontend `tsconfig` (TypeScript 6 enables it by default, but explicit is easier to review).
- **Checks from the root:** `npm install` (a single lockfile, 0 vulnerabilities), `npm run lint`, `npm run build`, `npm test` and the backend e2e test all pass. `npm run dev` serves the API on :3000 and the web app on :5173.
- The generated e2e test passing under Vitest confirms that Nest's constructor injection (which depends on `emitDecoratorMetadata`) works without an extra SWC plugin.

### Phase 1

- **Generated snapshot:** `npm run data:fetch` took 8.9 s and wrote 1,025 Pokémon, all with a description. Inspecting the file showed:
  - IDs 1 to 1,025 with no gaps, and unique names and display names.
  - No control characters or old all-caps "POKéMON" left in descriptions.
  - 18 types, 9 generations, 71 legendary and 23 mythical Pokémon.
  - Spot checks: Pikachu, Mr. Mime, Deoxys, Giratina, Type: Null and Pecharunt.
- **Test fixtures** (`backend/scripts/__fixtures__/`) are real responses from `/pokemon-species/{id}` and `/pokemon/{id}`, trimmed to the fields `transform()` reads, keeping some Spanish and Japanese entries to test the English filter. Deoxys is a useful case: its last flavor text is in Japanese, so the test proves the script takes the latest _English_ one, not the last entry.
- **Seed tests** run against an in-memory database. To check they actually catch bugs, Claude removed the table-clearing step on purpose: 2 of the 4 tests failed, and then it restored the step.
- **Rebuilding the database:** I deleted `backend/data/pokedex.sqlite` and ran `npm run seed`. It recreated the file. Claude then compared all 1,025 rows field by field against `pokemon.json` (0 differences), and `PRAGMA integrity_check` returned `ok`.
- **Checks from the root:** `npm run lint`, `typecheck`, `test` (16 tests), the backend e2e test, `build` and `format:check` all pass.
- **Re-validating the data after fixing `cleanDescription`**: I asked whether the bug could have left wrong descriptions in the JSON or the database. Claude regenerated the snapshot from PokeAPI with the corrected code and compared it with the committed `pokemon.json`: 0 differences in all 15 fields of the 1,025 Pokémon; only `generatedAt` changed. The committed file was restored, and the database already matched it.

### Phase 2

- **Before planning,** Claude tested the two decisions in a throwaway TypeORM 1.1 + `better-sqlite3` 12 project:
  - **LEFT JOIN:** with user A's favorites on Pokémon 2 and 5 and user B's on 3, user A's page came out `1:false 2:true 3:false 4:false 5:true 6:false`. Logging the SQL showed TypeORM runs 3 queries for a page with a join.
  - **FK:** TypeORM creates the `ON DELETE CASCADE` constraint and turns on `PRAGMA foreign_keys` when connecting; its source only turns it off for migrations and `clearDatabase`. Inserting a favorite for a missing Pokémon failed with `SQLITE_CONSTRAINT_FOREIGNKEY`, and the seed's `clear()` left 0 favorites.
- **31 e2e tests** run the real app (`configureApp()`, the same function `main.ts` uses) on an in-memory database seeded from the snapshot. They cover pagination, search (case, slug vs. display name, `%` and `_`), `400` for invalid parameters and headers, the detail and its `404`, and favorites (idempotency, isolation between users, no header, missing Pokémon). A unit test proves the seed deletes every favorite.
- **Mutation checks:** Claude broke four key pieces on purpose, one at a time: the `%`/`_` escaping, the user condition in the join, `OR IGNORE` on `PUT`, and the existence check on `PUT`. Each one made at least one test fail, and all 31 passed again after restoring the code.
- **Real server:** Claude built the app, seeded a temporary database and called every endpoint with `curl` on port 3100, without touching my `pokedex.sqlite`.
- **Checks from the root:** `npm run lint`, `typecheck`, `test` (16 unit tests), `test:e2e` (31), `build` and `format:check` all pass.

### Phase 3

- **The official Pokédex,** reviewed in a browser before planning: it loads 12 Pokémon and adds 12 per "Load more" click; on phones it shows a single column and the search fills the whole first screen; its "Load more" is an `<a>` without `href`; and several type pills have low contrast. We kept the card layout, the prominent search and "Load more", and changed the rest. Claude couldn't see the official empty-search state (the typed text didn't reach the field), so the 404 follows the challenge's wording instead.
- **7 frontend tests** render the whole app with a fake API that filters and paginates like the real one: the first 24 cards, "Load more" until all are shown, the debounced search (one request for the whole word), the search read from the URL, the 404 and "Clear search", the error and "Try again", and an unknown URL.
- **Mutation checks:** Claude broke three pieces on purpose: the next-page calculation, the debounce, and syncing the search box when the search changes from outside. Each made a test fail, and all 7 passed again after restoring the code.
- **In a real browser,** against the running app:
  - Columns: 6 at 1440 px, 4 at 1024, 3 at 768 and 2 at 375, with no horizontal scroll down to 320 px (checked with a long name, "Crabominable").
  - "Load more" went from 24 to 48 cards and kept the keyboard focus on the button.
  - Searching "char" updated the URL and found 7; "zzz" showed the 404 with the search still visible.
  - The contrast of all 18 type pills, measured on the rendered page, is at least 4.5:1.
  - The search button is 44 by 44 px on phones, and the console had no errors.
- **Checks from the root:** `npm run lint`, `typecheck`, `test` (16 backend unit tests and 7 frontend tests), `test:e2e` (31), `build` and `format:check` all pass.

### Phase 4

- **The official detail page,** reviewed in a browser before planning: two columns, a blue info box, stats as 15-segment bars with no number, and on phones the stats come before the description. "Explore More Pokémon" links to the list at the bottom.
- **Before writing the favorites hook,** Claude read TanStack Query's source to confirm that with a `scope`, `onMutate` (the optimistic update) still runs on every click and only the request waits its turn.
- **18 frontend tests** in this phase's scope: 5 for the user id (create and store, reuse, replace an invalid value, in-memory fallback when `localStorage` throws, a valid version 4 UUID without `crypto.randomUUID`), and 6 new app tests: the same `X-User-Id` on every request; the heart pressed before the server answers, then `PUT` and `DELETE`; the revert and message on a failed request; opening the detail from a card; the favorite state on the detail page; and the detail's 404 with its link back.
- **Mutation checks:** Claude removed the optimistic update, the rollback, the `X-User-Id` header and the user id's format check, one at a time. Each made a test fail, and all 18 passed again after restoring the code.
- **In a real browser,** against the running app:
  - Marking Charizard filled only its heart, and the API returned `isFavorite: true` with that browser's user id and `false` without it.
  - The detail page showed the tab title, the number, the abilities and the stats, and opened at the top of the page.
  - Measured contrast: the info box labels 4.8:1, its values and "Explore more" 5.86:1, the pressed favorite button 5.16:1.
  - On a phone the detail is one column in reading order, with no horizontal scroll; an unknown name shows the 404 at once, without a retry.
  - With 72 Pokémon loaded and the page scrolled, opening a detail and pressing the browser's back button restored the 72 cards and the scroll position.
  - The test favorite was unmarked afterwards, so the local database was left clean.
- **Checks from the root:** `npm run lint`, `typecheck`, `test` (16 backend unit tests and 18 frontend tests), `test:e2e` (31), `build` and `format:check` all pass.

## Rejected or rewritten

- **Removed `vite-tsconfig-paths` from Nest's generated Vitest configs.** Vitest warned that Vite now resolves tsconfig paths natively, the project has no path aliases, and the plugin pulled in a deprecated dependency (`tsconfck`).
- **Renamed Nest's `backend/oxlint.json` to `.oxlintrc.json`.** I noticed VS Code could not load its `$schema`, which pointed to a Rust source file (`rules.rs`). Checking with `oxlint --print-config` showed a bigger problem: oxlint only auto-discovers `.oxlintrc.json`, so the backend's lint config was silently ignored. Both apps' `$schema` now point to the schema shipped in the hoisted `node_modules/oxlint`.
- **Corrected the Node requirement** from `>=20` to `^22.22.3 || >=24.15.0` after `npm install` printed `EBADENGINE` warnings: the Nest CLI's `@angular-devkit` dependencies require it.
- **Fixed the generated e2e test's import** from `'supertest/types'` to `import type { App } from 'supertest/types.js'`. I noticed the editor error. The template was written for CommonJS; with Nest 12's ESM output (`moduleResolution: nodenext`), a subpath import into a package without `exports` needs the file extension. The tests had still passed because Vitest strips types without checking them, and `nest build` excludes `test/`. So I added `npm run typecheck` (`tsc --noEmit` in the backend, `tsc -b` in the frontend) to catch this kind of error outside the editor.
- **Rejected Claude's first phase 1 plan as overcomplicated** (four-file script, custom concurrency pool, backoff with jitter, atomic temp-file writes, upsert on every startup). It was replaced by the simplified plan in [docs/plan-1.md](docs/plan-1.md).
- **Rewrote a seed test whose name didn't match what it tested.** "Replaces rows that are not in the snapshot" modified Pikachu, which _is_ in the snapshot, so it would also pass with an upsert. It now inserts a row that is not in the snapshot and checks that the seed removes it.
- **Fixed an invisible character in `cleanDescription`, and renamed it from `cleanFlavorText`.** I asked Claude to explain the function because the name was unclear. While reviewing it, Claude found that the soft hyphen (U+00AD) in the first regex had been written as the literal, invisible character instead of its escape: in the editor the line looked like `/\s+/`, which made the code impossible to understand. Claude's editing tool converts escape sequences into the real characters, which is how it got in; it was also in the test and in the plan doc.
  - Claude's first attempt to fix it with `sed` produced a broken regex (`/00ad\s+/`), and **the test still passed**, because the test's input was corrupted the same way. It was caught by inspecting the raw bytes, not by the tests.
  - The final fix replaced the characters by their code points with a Node script, and a scan of the source files found no other invisible characters.
  - A mutation check now proves the test protects the rule: removing the soft-hyphen `replace` makes it fail.
  - I renamed the function to `cleanDescription`, the field where its output ends up. Its comment explains that it receives a PokeAPI flavor text (a Pokédex entry).
- **Removed the hardcoded `1025` from the seed tests.** I asked whether running the seed in the tests was safe and what would happen if the data changed. The tests were safe (in-memory database, the JSON is only read), but they compared against a fixed 1025: regenerating the snapshot with new Pokémon would fail them even with a correct seed. They now read the expected size from `pokemon.json`. A repeated mutation check confirmed they still catch a missing `clear()`.
- **Corrected Claude's argument against the LEFT JOIN.** Claude claimed it forced `getRawMany()` and mapping untyped rows. That was false: `leftJoinAndSelect` on a relation returns typed entities, and the FK I chose needs that relation anyway. The test also showed the LEFT JOIN doesn't save queries, so the choice came down to readability.
- **`@Headers()` doesn't accept pipes in Nest 12.** The plan assumed `@Headers('x-user-id', new ParseUUIDPipe())`; TypeScript rejected it. `@UserId()` is now a custom decorator built with `createParamDecorator`, which does accept pipes.
- **Clearer error for the user header.** Testing the real server showed that a missing `X-User-Id` returned the pipe's generic message, "The value passed as UUID is not a string". It now says "The X-User-Id header must be a UUID", and a test checks it.
- **Fixed a test bug Claude introduced.** A test built two supertest requests before sending the first; supertest closes its temporary server after each request, so the second one failed with `Cannot read properties of null (reading 'address')`. It was the test, not the API: each request is now built right before it is sent.
- **Dropped the planned `useDebouncedValue` hook.** With a debounced value and an effect, using the browser's back button would let a pending search write the old term back into the URL. The debounce now lives in the search box's change handler, which can't overwrite a URL that changed in the meantime.
- **Added `@testing-library/dom`,** which wasn't in the plan: it is a required peer dependency of `@testing-library/react`.
- **Corrected the plan's favorite button labels.** The plan combined `aria-pressed` with a label that changed ("Add Pikachu to favorites" / "Remove Pikachu from favorites"). For a toggle button that's a known accessibility mistake: the screen reader already announces the state, so it would say "Remove Pikachu from favorites, pressed". The label is now fixed ("Favorite Pikachu") and `aria-pressed` carries the state.
- **Moved the button styles to a shared file.** The detail page needed the same primary and secondary buttons as the list, so they moved from the list page's CSS to `styles/buttons.module.css` instead of being copied.
- **Stopped listing hidden abilities on the detail page.** During my manual test, Charmander showed "Solar Power (hidden)", which read as something that shouldn't be visible. "Hidden" is a game term (a rarer extra ability), but the label was ambiguous, and checking https://www.pokemon.com/us/pokedex/charmander showed the official site doesn't list hidden abilities. Following the reference, they are filtered out; Claude checked that every Pokémon still has at least one visible ability, and the test now checks that the hidden one isn't shown. The plan in [docs/plan-4.md](docs/plan-4.md) still describes the first version.
- **Made the search ignore punctuation, spaces and accents.** I asked which Pokémon with unusual names could break the detail route. Claude listed them from the data (non-ASCII, punctuation, hyphens, spaces) and requested all 1,025 detail routes against the running API: all worked, since every slug is plain `a-z`, `0-9` and hyphens. Searching for those names did fail: "farfetch'd" with a straight apostrophe (the name has ’), "mr mime", "type null", "ho oh", "porygon z" and "FLABÉBÉ" (SQLite's `LIKE` only folds ASCII case) found nothing.
  - The fix compares the term without punctuation, spaces or accents against the slug without hyphens (`REPLACE(name, '-', '')`), and keeps matching the display name as typed.
  - The first version introduced a regression that Claude caught by rerunning the searches on the real API: "nidoran♀" also found Nidoran♂, because compacting dropped the ♀. Symbols (Unicode category `\p{S}`) are now matched as typed, only against the display name.
  - 10 new e2e cases cover these names. Removing the compact comparison fails the 8 punctuation and accent cases, and removing the symbol rule fails the "nidoran♀" case.

## Known limitations and what I'd do with more time

- **Weaknesses on the detail page.** The official Pokédex shows them, but PokeAPI has no weaknesses field: they are derived from each type's damage relations in `/type/{name}` (`double_damage_from`, `half_damage_from`, `no_damage_from`), multiplying the factors of a Pokémon's types. For Bulbasaur (grass/poison), poison and bug cancel out (×2 × ×½), leaving fire, flying, ice and psychic, as on pokemon.com. The snapshot only reads `/pokemon` and `/pokemon-species`, and the scouting never looked at `/type`. The plan: fetch the 18 types once in `data:fetch` (skipping `stellar`, `unknown` and `shadow`), compute `weaknesses` in `transform()` with tests for cancellations, ×4 and immunities, add the column, and show the type pills on the detail page.
- **An offline state.** With the network offline, TanStack Query pauses requests instead of failing them, so the list shows its loading skeleton until the connection is back. A message for the paused state would explain it.
- **Search by number,** like the official "Name or Number" search. The challenge asks only for search by name.
- **A favorites view or filter.** The API has no `GET /api/favorites`; the challenge only asks to mark and show favorites.
- **Filtering by type in SQL.** Types are a `simple-json` column, enough for search and pagination; a type filter would need a `pokemon_types` table.
- **Previous and next Pokémon, and evolutions,** on the detail page. Evolutions need `/evolution-chain` and a tree structure.
- **Dark mode.** The design is light only.
- **Migrations instead of `synchronize`,** before any real deployment. The local SQLite is rebuilt from the snapshot, so `synchronize` is enough here.
- **Full-text search at scale.** `LIKE '%term%'` can't use an index; with 1,025 rows it takes microseconds, but a large catalog would need SQLite's FTS5 or a search engine.
