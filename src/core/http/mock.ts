/**
 * Tagged mock/static API layer.
 *
 * While the backend is not yet wired, feature `api.ts` modules return static
 * fixtures through {@link mockResponse}. Every mock call site is annotated with a
 * `// REPLACE_WITH_API: <METHOD> <path>` comment that names the real core-be
 * endpoint, so swapping to a live `apiClient` call later is a mechanical change
 * (search the codebase for `REPLACE_WITH_API`).
 *
 * Contracts (`contracts.ts`) mirror the real backend response shapes, so the UI
 * does not change when the swap happens.
 */

/** Default simulated network latency (ms) for mock responses. */
export const MOCK_DELAY_MS = 250;

export interface MockOptions {
  /** Simulated latency before resolving. Defaults to {@link MOCK_DELAY_MS}. */
  delayMs?: number;
  /** When set, the mock rejects with this error instead of resolving (for testing error states). */
  failWith?: Error;
}

/**
 * Resolve with static data after a simulated delay, mimicking a network call.
 *
 * The returned value is a deep clone so callers cannot mutate the shared fixture.
 *
 * @typeParam T - The response payload type (matches the feature contract).
 * @param data - The static fixture to return.
 * @param options - Optional latency / forced-failure controls.
 * @returns A promise resolving to a clone of `data`.
 * @throws The provided `options.failWith` error, if set.
 *
 * @example
 * // REPLACE_WITH_API: GET /api/v1/tenancy/organizations
 * export const listOrganizations = () => mockResponse(ORGANIZATIONS_FIXTURE);
 */
export async function mockResponse<T>(data: T, options: MockOptions = {}): Promise<T> {
  const { delayMs = MOCK_DELAY_MS, failWith } = options;

  if (delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  if (failWith) {
    throw failWith;
  }

  return structuredClone(data);
}
