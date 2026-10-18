# Phase 2 plan: backend endpoints

Goal: expose the list with search and pagination, the detail and the favorites, all from the database. The backend never calls PokeAPI.

## Decisions

| Topic                | Decision                                                                   | Why                                                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List validation      | **A `class-validator` DTO** and a global `ValidationPipe`                  | Idiomatic Nest: the rules (`@IsInt() @Min(1) @Max(100)`) are declarative and in one place. `ParseIntPipe` has no minimum or maximum                                  |
| `GET /api/favorites` | **Not included**                                                           | The challenge only asks to mark and show whether a Pokémon is a favorite; `isFavorite` in the list and the detail covers it. It goes to "what I'd do with more time" |
| `isFavorite`         | **LEFT JOIN** with `leftJoinAndSelect` on the `Pokemon.favorites` relation | Typed entities, no `getRawMany()`. The same number of queries as the alternative (see "Verified")                                                                    |
| Foreign key          | **FK from `favorites.pokemonId` to `pokemon.id` with `ON DELETE CASCADE`** | The database guarantees integrity. Consequence: **`npm run seed` deletes every favorite ("nuke and pave")**. It's documented                                         |

## Verified before implementing (October 16, 2026)

In a separate project with TypeORM 1.1 and `better-sqlite3` 12:

- **Typed LEFT JOIN:** with user A's favorites on Pokémon 2 and 5 and user B's on 3, user A's page came out `1:false 2:true 3:false 4:false 5:true 6:false`. Other users' favorites don't mix in.
- **Queries:** with `skip`/`take` and a join, TypeORM runs 3 queries (the page's distinct ids, the page with the join, and the count). The two-simple-queries alternative also adds up to 3 (page, count and favorites). It's a tie in performance; the LEFT JOIN reads better with the relation declared.
- **FK:** TypeORM generates `FOREIGN KEY ("pokemonId") REFERENCES "pokemon" ("id") ON DELETE CASCADE` and turns on `PRAGMA foreign_keys = ON` when connecting. It only turns it off during migrations and in `clearDatabase`.
- **The FK is enforced:** inserting a favorite for a nonexistent Pokémon fails with `SQLITE_CONSTRAINT_FOREIGNKEY`.
- **Nuke and pave:** the seed's `clear()` (`DELETE FROM pokemon` inside the transaction) leaves 0 favorites.
- **Nest 12:** `ParseUUIDPipe` accepts `optional: true`. `class-validator` 0.15 is compatible (an optional peer of `@nestjs/common`).

## Endpoints

```
GET    /api/pokemon?search=pika&page=1&limit=24   → paginated list with search
GET    /api/pokemon/:name                         → detail (by slug: /api/pokemon/mr-mime)
PUT    /api/favorites/:pokemonId                  → mark a favorite (idempotent) → 204
DELETE /api/favorites/:pokemonId                  → unmark (idempotent)          → 204
```

**User:** the `X-User-Id` header carries a UUID the client generates, validated with `ParseUUIDPipe`.

- For **reads** it's optional: without it, `isFavorite` is `false`.
- For `PUT` and `DELETE` it's **required**: if it's missing or isn't a valid UUID, the response is `400`.

### List: `GET /api/pokemon`

```json
{
  "items": [
    {
      "id": 25,
      "name": "pikachu",
      "displayName": "Pikachu",
      "image": "...",
      "types": ["electric"],
      "isFavorite": true
    }
  ],
  "total": 3,
  "page": 1,
  "limit": 24
}
```

- **Search:** `name LIKE '%q%' OR displayName LIKE '%q%'`, case-insensitive. That way "mr-mime" and "mr. mime" find the same thing.
  - `%` and `_` are escaped, so searching for "%" doesn't return everything.
  - The text is trimmed; if it ends up empty, it's the same as not searching.
- **Pagination:** `page` ≥ 1 (1 by default) and `limit` between 1 and 100 (24 by default), ordered by `id`. An invalid value (`page=abc`, `limit=0`) responds `400`.
- **No results:** responds `200` with `items: []`, and the frontend shows the 404 page.
- **Each card** includes `types` for the type labels.

```ts
const [items, total] = await this.pokemonRepository
  .createQueryBuilder('pokemon')
  .leftJoinAndSelect(
    'pokemon.favorites',
    'favorite',
    'favorite.userId = :userId',
    { userId },
  )
  .where(/* search */)
  .orderBy('pokemon.id')
  .skip((page - 1) * limit)
  .take(limit)
  .getManyAndCount();

// isFavorite = pokemon.favorites.length > 0
```

### Detail: `GET /api/pokemon/:name`

Returns all the entity's fields plus `isFavorite`. If the name doesn't exist, `404`.

### Favorites

- **`Favorite` entity:** `userId` (text) and `pokemonId` (integer), with a composite primary key of both, plus `createdAt`. `@ManyToOne(() => Pokemon, { onDelete: 'CASCADE' })`.
- **`Pokemon` entity:** adds a `@OneToMany` to `favorites`. That property isn't in the snapshot, but it doesn't affect the seed: the snapshot doesn't carry it and `insert` ignores it.
- **`PUT`:** first checks that the Pokémon exists and, if not, responds `404`. Without that check, the FK error would arrive as a `500`. Then it does `INSERT ... OR IGNORE`, so marking twice neither duplicates nor fails.
- **`DELETE`:** deletes the row if it exists; if it didn't exist, it also responds `204`.

## Structure

```
backend/src/
  main.ts                  → setGlobalPrefix('api') and a global ValidationPipe
  app.module.ts            → without AppController or AppService (the "Hello World" is removed)
  pokemon/
    pokemon.controller.ts
    pokemon.service.ts
    list-pokemon.query.ts  → the query DTO (search, page, limit)
    pokemon.types.ts       → response shapes: PokemonListItem, PokemonPage, PokemonDetail
  favorites/
    favorite.entity.ts
    favorites.controller.ts
    favorites.service.ts
    favorites.module.ts
```

To avoid a circular dependency between modules, each module registers both entities with `forFeature([Pokemon, Favorite])` and uses the repositories directly.

**The frontend** will call `/api` through a Vite proxy to `localhost:3000`: everything stays on the same origin and no CORS configuration is needed. That setting is done in phase 3.

## Tests

**e2e with supertest** against `AppModule`, using an in-memory database (`DATABASE_PATH=':memory:'` in the Vitest e2e config) filled with the real seed. They replace the "Hello World" e2e test.

- **List:** pagination, search (`pika`, `mr. mime`, no results, `%`) and `400` for invalid parameters.
- **Detail:** a found case and `404`.
- **Favorites:** `PUT` twice, `DELETE`, `isFavorite` in the list and the detail, isolation between two users, `400` without the header and `404` for a nonexistent Pokémon.
- **Seed:** a test confirming that `npm run seed` **deletes the favorites**, so the decision is tested.

## Documentation

- README: next to `npm run seed`, warn that it deletes every favorite ("nuke and pave"), and add the endpoints table.
- `AI_USAGE.md`: this phase's decisions, including the correction about `getRawMany()`. Claude first argued that the LEFT JOIN forced its use; that was false, and the test showed the typed version.
