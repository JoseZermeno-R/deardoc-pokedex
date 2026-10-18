// The anonymous user the challenge suggests: a random UUID created in the
// browser and sent to the API in the X-User-Id header.

const STORAGE_KEY = 'pokedex.userId';
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Used only when localStorage is unavailable; lasts until the page reloads.
let inMemoryId: string | undefined;

/**
 * The stored user id, created on first use. localStorage is read on every
 * call (it's cheap), so a value edited by hand takes effect right away.
 */
export function getUserId(): string {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    // An invalid value would make the API answer 400 to every request.
    if (stored && UUID_PATTERN.test(stored)) return stored;
    const id = createUuid();
    localStorage.setItem(STORAGE_KEY, id);
    return id;
  } catch {
    // Some private modes, or blocked storage, make localStorage throw.
    inMemoryId ??= createUuid();
    return inMemoryId;
  }
}

/**
 * crypto.randomUUID() only exists in secure contexts (HTTPS or localhost),
 * so opening the app by IP, e.g. from a phone, falls back to building a
 * version 4 UUID from crypto.getRandomValues(), which works everywhere.
 */
export function createUuid(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return [
    hex.slice(0, 4),
    hex.slice(4, 6),
    hex.slice(6, 8),
    hex.slice(8, 10),
    hex.slice(10, 16),
  ]
    .map((group) => group.join(''))
    .join('-');
}
