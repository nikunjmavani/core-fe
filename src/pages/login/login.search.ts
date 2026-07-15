/**
 * URL search-param schema for /login (consumed by routeTree's `validateSearch`).
 * `redirect` = post-login return path, set by requireAuth (validated in
 * LoginForm). Optional return type keeps `search` optional for plain links.
 */
export interface LoginSearch {
  redirect?: string;
}

export function validateLoginSearch(search: Record<string, unknown>): LoginSearch {
  return {
    redirect: typeof search.redirect === 'string' ? search.redirect : undefined,
  };
}
