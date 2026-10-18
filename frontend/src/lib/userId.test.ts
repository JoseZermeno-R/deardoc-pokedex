import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createUuid, getUserId } from './userId';

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('getUserId', () => {
  it('creates a UUID and stores it when there is none', () => {
    const id = getUserId();

    expect(id).toMatch(UUID_V4);
    expect(localStorage.getItem('pokedex.userId')).toBe(id);
  });

  it('reuses the stored id', () => {
    const stored = '11111111-2222-4333-8444-555555555555';
    localStorage.setItem('pokedex.userId', stored);

    expect(getUserId()).toBe(stored);
    expect(getUserId()).toBe(stored);
  });

  it('replaces a stored value that is not a UUID', () => {
    localStorage.setItem('pokedex.userId', 'edited-by-hand');

    const id = getUserId();

    expect(id).toMatch(UUID_V4);
    expect(localStorage.getItem('pokedex.userId')).toBe(id);
  });

  it('falls back to an in-memory id when localStorage throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    const first = getUserId();

    expect(first).toMatch(UUID_V4);
    expect(getUserId()).toBe(first);
  });
});

describe('createUuid', () => {
  it('builds a version 4 UUID when crypto.randomUUID is unavailable', () => {
    // As on a page opened by IP over plain HTTP (not a secure context).
    const { getRandomValues } = crypto;
    vi.stubGlobal('crypto', {
      getRandomValues: getRandomValues.bind(crypto),
    });

    const ids = new Set(Array.from({ length: 50 }, () => createUuid()));

    expect(ids.size).toBe(50);
    for (const id of ids) expect(id).toMatch(UUID_V4);
  });
});
