/**
 * Re-exports the fetch-based API client for backward compatibility.
 * All call sites should use apiClient and isUnauthorized from here;
 * implementation lives in fetch-client.ts.
 */
export { apiClient, isUnauthorized } from './fetch-client.ts';
