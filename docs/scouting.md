# DearDoc technical challenge: scouting

## Refer to this document for

- **The challenge details:** [what the challenge asks for](#what-the-challenge-asks-for).
- **Decisions that shape the development,** such as the tech stack, the structure and the data model: [decisions made](#decisions-made-planning-session-october-16-2026) and the [PokeAPI data strategy](#1-pokeapi-data-strategy-decided).
- **Findings from exploring PokeAPI,** the public API: [findings](#findings-about-pokeapi), [endpoints](#pokeapi-endpoints) and the [transformed JSON fields](#transformed-json-fields).
- **The API proposal:** [API proposal](#api-proposal).
- **The work plan:** [work plan](#work-plan).
- **Details and considerations to keep in mind during development:** [details to take care of](#details-to-take-care-of) and [considerations](#considerations).

This document was written before the implementation. Some decisions changed along the way (for example, "Load more" replaced classic pagination, and the seed became manual); each phase's plan in `docs/plan-0.md` to `docs/plan-4.md` records what was finally built.

## What the challenge asks for

**Features:**

- A main view with the list of Pokémon (picture and name).
- Search by name, with the results in the main view or a blank 404 page if there are none.
- Mark a Pokémon as a favorite and show whether it is one. Nothing else is asked about favorites; it can be in the same main view.

**Requirements:**

- A fullstack application: its own REST backend and a frontend that consumes it. They recommend Node.js + TypeScript with React or Vue.
- Any database. PokeAPI (https://pokeapi.co/docs/v2) can be used, but wrapped in my own API or by importing the data into my database. **The client never calls PokeAPI directly.**
- A public repo (GitHub or another) with a README that explains how to run the app.

**README recommendations:**

- Keep it simple: they want something simple and well done, not complex.
- No authentication system is needed: a random UUID generated in the client is enough.
- Use the tools I'm most comfortable with ("we want to see your best work").
- Tests aren't required, but they're a plus.

**Required: `AI_USAGE.md`** (or a README section) with:

- The AI tools used: name, version and which part of the work.
- The main prompts and how I iterated on them.
- Technical decisions (stack, architecture, PokeAPI caching, API design, state management) and why. **State which were mine and which the AI suggested.**
- How I reviewed and tested the generated code, and what I rejected or rewrote.

They value transparency and being able to **defend every line**.

**Optional items they find interesting:** known limitations and what I'd do with more time; time spent and how it was split; issues I hit and how I debugged them; scalability notes (pagination, caching, rate limiting of the PokeAPI wrapper); accessibility and responsive design; screenshots or a demo (GIF or video).

## Decisions made (planning session, October 16, 2026)

I made all of them, proposing my own and choosing between options the AI presented to fill in the gaps.

| Topic           | Decision                                                                                                                                         | Why                                                                            |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Stack           | **React + NestJS + SQLite** (TypeORM)                                                                                                            | My strongest stack; SQLite needs no install.                                   |
| Repo            | **New folder**                                                                                                                                   | A clean public repo                                                            |
| Structure       | **npm workspaces**: `backend/` and `frontend/` with a root `package.json`; `npm run dev` starts both with `concurrently`                         | One `npm install` and a single terminal                                        |
| Database model  | **`pokemon` table with `simple-json` columns** (`types`, `abilities`, `stats`) + `favorites` table (`userId`, `pokemonId`, composite unique key) | Enough for search and pagination.                                              |
| List navigation | **Classic pagination**, with the state in the URL (`?search=pika&page=3`)                                                                        | Accessible, easy to test, shareable URL, and the back button works             |
| Detail          | **A separate page** at `/pokemon/:name`                                                                                                          | Its own URL, no focus trap; fits with the 404                                  |
| Frontend        | **Vite + React Router + TanStack Query**, no global state library                                                                                | Query handles caching, loading/error and the optimistic favorite with rollback |
| Styles          | **CSS Modules** with CSS variables for the type colors                                                                                           | Comes with Vite, no dependencies                                               |

**Verified live (Oct 16):** `/pokemon-species/{id}` → `names` with `language.name === 'en'` returns `Mr. Mime` and `Deoxys` (the default form is `deoxys-normal`). **The species call is required**, not optional: `name` and `displayName` come from it. The snapshot makes 2,051 calls.

**Environment:** Node 24.14.0, npm 11.9.0. Set `"engines": { "node": ">=20" }` and check that `better-sqlite3` installs from a prebuilt binary on Windows.

## Decisions

### 1. PokeAPI data strategy (decided)

**JSON snapshot + seed.** Separate getting the data from inserting it:

```
backend/
  scripts/fetch-pokemon.ts   → npm run data:fetch   (calls PokeAPI, transforms and writes the JSON)
  data/pokemon.json          → versioned in the repo
  src/.../seed.ts            → npm run seed         (reads the JSON and inserts it)
```

- The backend runs the seed automatically on startup if the table is empty. The README stays as `npm install` and `npm run dev`.
- The JSON includes the **full detail** the app will use. I make the 1,000 to 2,000 calls to PokeAPI (see "PokeAPI endpoints") once, when generating it, not the reviewers.
- **The backend never calls PokeAPI at runtime.** List, search, detail and favorites come from the database (search with `LIKE`, pagination with `LIMIT`/`OFFSET`, `isFavorite` with a `LEFT JOIN`).
- It meets the requirement: the challenge README allows _consuming the API and inserting the Pokémon into your own database_. The script stays in the repo as evidence.

**Why not the alternatives:**

- An in-memory cache with a TTL: it's lost on every restart, search and pagination would be done over arrays, and the data barely changes, so the TTL adds nothing.
- A seed that calls PokeAPI directly: it makes setup slow and dependent on PokeAPI being available.

**Details to take care of:**

1. **Store the transformed JSON, not the raw response.** PokeAPI's detail is huge (`moves` alone can have hundreds of entries). With the fields in "Transformed JSON fields", the file is around 700 KB and documents the data model.
2. **The script is the challenge's integration sample.** It should have bounded concurrency (for example, 10 at a time), retries with a wait, timeouts, output sorted by `id` (so regenerating it doesn't produce needless diffs) and metadata in the JSON (`generatedAt`, source).
3. **Idempotent seed:** upsert by `id`, so running it twice neither duplicates nor breaks.
4. **Limitation to document:** new Pokémon don't appear until the JSON is regenerated with `npm run data:fetch`.

The pictures still load in the browser from PokeAPI's sprites repository on GitHub. That's allowed (the README mentions those links) and it isn't an API call.

## Findings about PokeAPI

**1. The list doesn't include pictures.** `GET /pokemon?limit=20` returns only `name` and `url`. Requesting each Pokémon's detail to get its picture would be an N+1 problem. The ID comes in the `url` (`.../pokemon/25/`), and the pictures follow a predictable pattern:

```
https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{id}.png
```

With that, the whole list comes from a single call. In the snapshot script, the picture can also be taken from each Pokémon's detail, since it's requested anyway.

**2. There's no partial search.** `/pokemon/{name}` only works with the exact name. To search by partial text ("pika" → Pikachu), all the names have to be in my database and filtered there. The snapshot already solves this.

**3. Fair use.** PokeAPI asks not to overload it. With the snapshot I only call it when generating the JSON, with bounded concurrency.

## PokeAPI endpoints

Verified live on October 16, 2026. All are `GET`, with no authentication and **no body**. Base URL: `https://pokeapi.co/api/v2`.

### 1. Species list (for the snapshot)

```
GET /pokemon-species?limit={n}&offset={n}
```

| Parameter | Type  | Description                                                   |
| --------- | ----- | ------------------------------------------------------------- |
| `limit`   | Query | How many it returns (20 by default). For the snapshot, `2000` |
| `offset`  | Query | The position it starts from                                   |

Returns **1,025** records, one per species, with IDs `1`–`1025`:

```json
{
  "count": 1025,
  "next": "https://pokeapi.co/api/v2/pokemon-species?offset=1&limit=1",
  "previous": null,
  "results": [
    {
      "name": "bulbasaur",
      "url": "https://pokeapi.co/api/v2/pokemon-species/1/"
    }
  ]
}
```

### 2. Pokémon list (reference; not used in the snapshot)

```
GET /pokemon?limit={n}&offset={n}
```

Same parameters. Returns **1,351** records: the 1,025 default ones (IDs `1`–`1025`, consecutive) plus **326 alternate forms** with IDs from `10001` (mega evolutions like `clefable-mega`, Gigantamax like `pikachu-gmax`, variants like `pikachu-rock-star`). **It has no parameter to filter only the default forms**; `is_default` only comes in the detail.

```json
{
  "count": 1351,
  "next": "https://pokeapi.co/api/v2/pokemon?offset=3&limit=3",
  "previous": null,
  "results": [
    { "name": "bulbasaur", "url": "https://pokeapi.co/api/v2/pokemon/1/" },
    { "name": "ivysaur", "url": "https://pokeapi.co/api/v2/pokemon/2/" },
    { "name": "venusaur", "url": "https://pokeapi.co/api/v2/pokemon/3/" }
  ]
}
```

### 3. Pokémon detail (required)

```
GET /pokemon/{idOrName}
```

| Parameter  | Type | Description                                           |
| ---------- | ---- | ----------------------------------------------------- |
| `idOrName` | Path | The ID (`25`) or the exact lowercase name (`pikachu`) |

Pikachu's response trimmed to the useful fields. **The full one is about 300 KB**, mostly because of `moves` (109 entries for Pikachu alone):

```json
{
  "id": 25,
  "name": "pikachu",
  "height": 4,
  "weight": 60,
  "is_default": true,
  "types": [
    {
      "slot": 1,
      "type": {
        "name": "electric",
        "url": "https://pokeapi.co/api/v2/type/13/"
      }
    }
  ],
  "abilities": [
    {
      "is_hidden": false,
      "slot": 1,
      "ability": { "name": "static", "url": "..." }
    },
    {
      "is_hidden": true,
      "slot": 3,
      "ability": { "name": "lightning-rod", "url": "..." }
    }
  ],
  "stats": [
    { "base_stat": 35, "effort": 0, "stat": { "name": "hp", "url": "..." } },
    {
      "base_stat": 55,
      "effort": 0,
      "stat": { "name": "attack", "url": "..." }
    },
    {
      "base_stat": 40,
      "effort": 0,
      "stat": { "name": "defense", "url": "..." }
    },
    {
      "base_stat": 50,
      "effort": 0,
      "stat": { "name": "special-attack", "url": "..." }
    },
    {
      "base_stat": 50,
      "effort": 0,
      "stat": { "name": "special-defense", "url": "..." }
    },
    { "base_stat": 90, "effort": 2, "stat": { "name": "speed", "url": "..." } }
  ],
  "sprites": {
    "front_default": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    "other": {
      "official-artwork": {
        "front_default": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
        "front_shiny": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/shiny/25.png"
      }
    }
  },
  "species": {
    "name": "pikachu",
    "url": "https://pokeapi.co/api/v2/pokemon-species/25/"
  }
}
```

- **Units:** `height` in decimetres and `weight` in hectograms. Pikachu: `4` → 0.4 m, `60` → 6.0 kg.
- **Picture:** `sprites.other["official-artwork"].front_default`. It follows the predictable URL pattern, also for alternate forms.
- **If it doesn't exist**, it responds `404` (tested with `/pokemon/notapokemon`).

### 4. Species detail (optional, for the description and category)

```
GET /pokemon-species/{idOrName}
```

| Parameter  | Type | Description            |
| ---------- | ---- | ---------------------- |
| `idOrName` | Path | The species ID or name |

It provides what `/pokemon` doesn't have, also in Spanish. Pikachu's response trimmed (the full one is about 50 KB):

```json
{
  "id": 25,
  "name": "pikachu",
  "generation": { "name": "generation-i", "url": "..." },
  "is_legendary": false,
  "is_mythical": false,
  "genera": [
    { "genus": "Pokémon Ratón", "language": { "name": "es", "url": "..." } },
    { "genus": "Mouse Pokémon", "language": { "name": "en", "url": "..." } }
  ],
  "flavor_text_entries": [
    {
      "flavor_text": "When several of\nthese POKéMON\ngather, their\felectricity could\nbuild and cause\nlightning storms.",
      "language": { "name": "en", "url": "..." },
      "version": { "name": "red", "url": "..." }
    }
  ],
  "varieties": [
    {
      "is_default": true,
      "pokemon": {
        "name": "pikachu",
        "url": "https://pokeapi.co/api/v2/pokemon/25/"
      }
    },
    {
      "is_default": false,
      "pokemon": {
        "name": "pikachu-rock-star",
        "url": "https://pokeapi.co/api/v2/pokemon/10080/"
      }
    }
  ]
}
```

The `flavor_text` values carry `\n` and control characters (`\f`) from the original games: they have to be cleaned when transforming.

### Decision: only the 1,025 default forms (recommended)

If all 1,351 are included, searching for "pikachu" shows 17 results. With only the default forms it behaves like a real Pokédex: one record per species.

Ways to get the 1,025:

1. **List the species (recommended):** `/pokemon-species?limit=2000` and then `/pokemon/{id}` for each one. The species ID matches its default form's ID. It's the explicit intent and doesn't depend on ID ranges.
2. Filter `/pokemon?limit=2000` by `id < 10000`. It works today, but depends on a PokeAPI convention that isn't guaranteed.
3. Request the detail of all 1,351 and filter by `is_default`. Exact, but wastes 326 calls of ~300 KB.

**Watch out for the names:** for some species, the default form has a different name from the species (`deoxys` → `deoxys-normal`, `giratina` → `giratina-altered`). Searching with `LIKE` finds both, but I have to decide which one to show; the species name usually looks better in the UI.

### Snapshot script flow

| Call                                                                                                | Count |
| --------------------------------------------------------------------------------------------------- | ----- |
| `GET /pokemon-species?limit=2000`                                                                   | 1     |
| `GET /pokemon/{id}` for each species                                                                | 1,025 |
| `GET /pokemon-species/{id}` (required: `name`, `displayName`, `genus`, `description`, `generation`) | 1,025 |

In total, 2,051 calls and about 300 MB downloaded to keep a JSON of around 700 KB. That's why bounded concurrency and storing only the transformed fields matter.

## Transformed JSON fields

Criterion: store only what the UI will show or use for searching, already transformed into how it will be used. The JSON is the data model, and the backend converts nothing at runtime.

### Structure

```json
{
  "source": "https://pokeapi.co/api/v2",
  "generatedAt": "2026-10-16T18:00:00.000Z",
  "count": 1025,
  "pokemon": [
    {
      "id": 25,
      "name": "pikachu",
      "displayName": "Pikachu",
      "image": "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png",
      "types": ["electric"],
      "heightM": 0.4,
      "weightKg": 6.0,
      "abilities": [
        { "name": "static", "isHidden": false },
        { "name": "lightning-rod", "isHidden": true }
      ],
      "stats": {
        "hp": 35,
        "attack": 55,
        "defense": 40,
        "specialAttack": 50,
        "specialDefense": 50,
        "speed": 90
      },
      "genus": "Mouse Pokémon",
      "description": "When several of these Pokémon gather, their electricity could build and cause lightning storms.",
      "generation": 1,
      "isLegendary": false,
      "isMythical": false
    }
  ]
}
```

### Where each field comes from

| Field                       | Source                                                              | Transformation                                          | Used for                                      |
| --------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------------- |
| `id`                        | `/pokemon/{id}` → `id`                                              | None                                                    | Primary key, favorites, ordering              |
| `name`                      | `/pokemon-species/{id}` → `name`                                    | None (slug: `mr-mime`, `deoxys`)                        | Search and frontend URLs (`/pokemon/mr-mime`) |
| `displayName`               | `/pokemon-species/{id}` → `names` in English                        | Take the entry with `language.name === 'en'`            | What the UI shows                             |
| `image`                     | `/pokemon/{id}` → `sprites.other["official-artwork"].front_default` | None                                                    | Card and detail                               |
| `types`                     | `/pokemon/{id}` → `types`                                           | Sort by `slot` and keep `type.name`                     | Type labels, colors                           |
| `heightM`                   | `/pokemon/{id}` → `height`                                          | Divide by 10 (decimetres → metres)                      | Detail                                        |
| `weightKg`                  | `/pokemon/{id}` → `weight`                                          | Divide by 10 (hectograms → kg)                          | Detail                                        |
| `abilities`                 | `/pokemon/{id}` → `abilities`                                       | Sort by `slot`; `ability.name` and `is_hidden`          | Detail                                        |
| `stats`                     | `/pokemon/{id}` → `stats`                                           | Turn the array into an object with fixed camelCase keys | Stat bars                                     |
| `genus`                     | `/pokemon-species/{id}` → `genera` in English                       | Take `genus`                                            | Subtitle ("Mouse Pokémon")                    |
| `description`               | `/pokemon-species/{id}` → `flavor_text_entries` in English          | Take the most recent one and clean `\n` and `\f`        | Pokédex text                                  |
| `generation`                | `/pokemon-species/{id}` → `generation.name`                         | `"generation-i"` → `1`                                  | Optional filter, detail                       |
| `isLegendary`, `isMythical` | `/pokemon-species/{id}`                                             | None                                                    | Badge in the UI                               |

### Why these decisions

- **`name` and `displayName` separately, taken from the species.** Checked with two cases: the species `mr-mime` is shown as `Mr. Mime`, and the species `deoxys` has `deoxys-normal` as its default form. Taking them from the species solves the naming problem: it shows "Deoxys", not "deoxys-normal". Search filters by both, so "mr. mime" and "mr-mime" find the same thing.
- **Units converted once in the script.** With `height: 4`, every place that uses it would have to remember it's in decimetres. The suffix (`heightM`, `weightKg`) makes the unit explicit.
- **`stats` as an object, not an array.** The six stats are fixed: it's easy to type in TypeScript (`stats.speed`) and maps directly to columns if needed.
- **English texts.** Only the English `genus` and description are stored.
- **The most recent description.** For Mr. Mime, the latest English entry is from `legends-arceus`. The older ones sometimes come in capitals ("POKéMON"). If a species has no recent English entry, fall back to the previous one.

### What's left out

- **`moves`:** it's what makes the responses heavy (hundreds per Pokémon) and adds nothing to any of the challenge's features.
- **Alternate sprites** (shiny, back, per generation): only if I decide to show the shiny version. An easy visual extra, but optional.
- **Evolutions:** they need another endpoint (`/evolution-chain`) and a tree structure. A candidate for "what I'd do with more time".
- **`base_experience`, `order`, `game_indices`, `held_items`:** not used in the UI.

With these fields, each Pokémon is about 700 bytes and the 1,025 come to **around 700 KB**.

## API proposal

```
GET    /api/pokemon?search=pika&page=1&limit=24   → { items: [{ id, name, image, isFavorite }], total, page }
GET    /api/pokemon/:idOrName                      → detail: types, stats, height, weight, abilities
GET    /api/favorites                              → the user's favorites
PUT    /api/favorites/:pokemonId                   → mark (idempotent)
DELETE /api/favorites/:pokemonId                   → unmark
```

- **User:** a UUID generated in the client, stored in `localStorage` and sent in a header (`X-User-Id`). The backend validates that it's a valid UUID.
- **`isFavorite`:** the backend adds it to each list result, so the frontend doesn't have to cross-reference two lists.
- **`PUT` to mark favorites:** marking twice leaves the same result (idempotent).
- **Search with no results:** the list responds `200` with empty `items` and the frontend shows the 404 page. The detail of a nonexistent Pokémon responds `404`.
- **Everything comes from the database**, including the detail, thanks to the snapshot.

## Work plan

First a complete minimum product and then the improvements, so there's always something working to deliver.

| Phase                             | What it includes                                                                                                                                                                        | Estimated time |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| 0. Setup                          | Repo with `backend/` and `frontend/`, initial README and `AI_USAGE.md`, Prettier                                                                                                        | 1 h            |
| 1. Data                           | Snapshot script (`data:fetch`), generate and version `pokemon.json`, entities, idempotent seed and automatic seed on startup                                                            | 2–3 h          |
| 2. Backend: endpoints             | List with search and pagination, detail, favorites                                                                                                                                      | 2 h            |
| 3. Frontend: list and search      | Responsive grid, debounced search, 404 page                                                                                                                                             | 2–3 h          |
| 4. Frontend: favorites and detail | Favorite button with optimistic update, detail view                                                                                                                                     | 2 h            |
| **Complete minimum product**      |                                                                                                                                                                                         | **~10 h**      |
| 5. Tests                          | The script's transformation with mocked PokeAPI responses, backend services and e2e with supertest using the same JSON, one or two frontend tests with Vitest and React Testing Library | 2 h            |
| 6. Documentation                  | README, `AI_USAGE.md`, limitations, screenshots or a GIF                                                                                                                                | 1–2 h          |

## Details to take care of

- **Accessibility:** `alt` on the pictures; the favorite button with `aria-pressed` and a clear label; keyboard navigable.
- **Responsive:** a grid that adapts from phone to desktop.
- **UI states:** loading, error (for example, if PokeAPI doesn't respond) and empty (the 404 page).
- **Backend validation:** the header's UUID, the pagination parameters and the `pokemonId`.

## Considerations

- The data retrieval strategy. The AI proposed seeding from PokeAPI (or caching in memory) with the detail on demand. I proposed separating a script that generates a JSON versioned in the repo from a seed that only inserts it.
- Make small commits with clear messages.
- Review all generated code before committing. Note what I reject or rewrite.
