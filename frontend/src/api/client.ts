export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type QueryParams = Record<string, string | number | undefined>;

/** GET /api{path}. Empty and undefined params are left out of the URL. */
export async function apiGet<T>(
  path: string,
  params: QueryParams = {},
  signal?: AbortSignal,
): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') query.set(key, String(value));
  }
  const url = `/api${path}${query.size > 0 ? `?${query}` : ''}`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new ApiError(
      response.status,
      `GET ${url} responded ${response.status}`,
    );
  }
  return (await response.json()) as T;
}
