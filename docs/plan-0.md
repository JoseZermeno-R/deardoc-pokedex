# Phase 0 plan: setup

Goal: a monorepo with `backend/` and `frontend/` that installs with a single `npm install` and starts with a single `npm run dev`, with formatting, lint, typecheck and tests working from the first commit.

## What was done

1. **Repo:** `git init -b main` and a root `package.json` with `workspaces`, `engines` and the shared scripts.
2. **Backend:** generated with `@nestjs/cli new backend --skip-git --skip-install --strict`.
3. **Frontend:** generated with `create-vite frontend --template react-ts`.
4. **Template cleanup:** removed the sample READMEs, Vite's counter demo and its assets, Nest's `deploy` script and the `@nestjs/mau` dependency. The frontend became a minimal page with the title "Pokédex".
5. **Shared configuration at the root:**
   - `.prettierrc` and `.prettierignore`: a single Prettier configuration.
   - `.gitattributes` (`eol=lf`): avoids formatting-only diffs on Windows.
   - `.gitignore`, `.nvmrc`.
   - `.vscode/settings.json` (Prettier as the formatter on save) and `.vscode/extensions.json` (recommended extensions).
6. **Initial documentation:** `README.md` and `AI_USAGE.md`.

### What the tools generated (and was kept)

- **Nest 12:** ESM (`"type": "module"`, imports with `.js`), Vitest instead of Jest, oxlint instead of ESLint, and TypeScript 6.
- **Vite 8:** oxlint and TypeScript 6. `"strict": true` was made explicit in the frontend's `tsconfig` (TypeScript 6 already turns it on, but this way it's visible).

### Root scripts

| Script                            | What it does                                  |
| --------------------------------- | --------------------------------------------- |
| `npm run dev`                     | API (`:3000`) and web (`:5173`) in watch mode |
| `npm run build`                   | Builds both workspaces                        |
| `npm test`                        | Tests of both workspaces                      |
| `npm run lint`                    | oxlint in both workspaces                     |
| `npm run typecheck`               | Type-checks both workspaces, tests included   |
| `npm run format` / `format:check` | Prettier                                      |

## Left open on purpose

The lint configuration was reviewed and it was decided to **leave it as is for now**:

- **Warnings don't fail `npm run lint`:** oxlint exits with `0` even when it finds warnings. `--deny-warnings` would fix it.
- **`no-floating-promises` doesn't run:** it needs `--type-aware` and the `oxlint-tsgolint` package. Today that line of the backend config has no effect.

## Verification

- `npm install` at the root: a single lockfile and 0 vulnerabilities. No `EBADENGINE` warnings after updating Node.
- `npm run lint`, `typecheck`, `build`, `test`, the backend e2e test and `format:check` pass.
- `npm run dev` starts the API (`Hello World!` on `:3000`) and the web app (`<title>Pokédex</title>` on `:5173`).
- The generated e2e test passing under Vitest confirms that Nest's dependency injection (which relies on `emitDecoratorMetadata`) works without an SWC plugin.
