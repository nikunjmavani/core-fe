import { createHttpDataProvider } from './http-data-provider/index.ts';

export type { DataProvider, ListParams, ListResult } from './dataProvider.ts';
export { createHttpDataProvider } from './http-data-provider/index.ts';
export { createMockDataProvider } from './mock-data-provider/index.ts';

/**
 * Singleton data provider used by the standard CRUD hooks
 * (`useList`, `useOne`, `useCreate`, `useUpdate`, `useDelete`).
 *
 * Swap this assignment to {@link createMockDataProvider} for offline dev or
 * to a future GraphQL adapter without touching any page code.
 */
export const dataProvider = createHttpDataProvider('/api/v1');
