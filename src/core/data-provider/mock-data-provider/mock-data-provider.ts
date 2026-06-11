import type { DataProvider, ListParams, ListResult } from '../dataProvider.ts';

type Row = { id: string } & Record<string, unknown>;
type Store = Record<string, Row[]>;

let counter = 0;
function nextId(): string {
  counter += 1;
  return `mock-${counter}`;
}

/**
 * In-memory mock adapter for the {@link DataProvider} contract. Useful for
 * dev/storybook flows before the backend exists, and for unit tests that
 * exercise CRUD hooks without touching `apiClient`.
 *
 * Each instance has its own private store; create a fresh one per test.
 */
export function createMockDataProvider(seed: Store = {}): DataProvider {
  const store: Store = JSON.parse(JSON.stringify(seed));

  const rows = (resource: string): Row[] => {
    // eslint-disable-next-line security/detect-object-injection -- `resource` is a typed parameter from the calling hook
    store[resource] ??= [];
    // eslint-disable-next-line security/detect-object-injection -- same as above
    return store[resource]!;
  };

  function applyParams<T>(list: Row[], params?: ListParams): ListResult<T> {
    let result = [...list];

    if (params?.filters) {
      result = result.filter((row) =>
        Object.entries(params.filters!).every(
          // eslint-disable-next-line security/detect-object-injection -- filtering by user-supplied keys against an opaque row map (mock only)
          ([k, v]) => v === undefined || v === null || v === '' || row[k] === v,
        ),
      );
    }

    if (params?.sort) {
      const { field, order } = params.sort;
      result.sort((a, b) => {
        // eslint-disable-next-line security/detect-object-injection -- mock-only sort by user-supplied field
        const av = a[field];
        // eslint-disable-next-line security/detect-object-injection -- mock-only sort by user-supplied field
        const bv = b[field];
        if (av === bv) return 0;
        const cmp = (av as number | string) < (bv as number | string) ? -1 : 1;
        return order === 'asc' ? cmp : -cmp;
      });
    }

    const total = result.length;

    if (params?.pagination) {
      const { page, perPage } = params.pagination;
      const start = (page - 1) * perPage;
      result = result.slice(start, start + perPage);
    }

    return { data: result as unknown as T[], total };
  }

  return {
    getList: async <T>(resource: string, params?: ListParams) =>
      applyParams<T>(rows(resource), params),

    getOne: async <T>(resource: string, id: string) => {
      const row = rows(resource).find((r) => r.id === id);
      if (!row) throw new Error(`[mock] ${resource}/${id} not found`);
      return row as unknown as T;
    },

    create: async <T, D = Partial<T>>(resource: string, data: D) => {
      const row: Row = { id: nextId(), ...(data as Record<string, unknown>) };
      rows(resource).push(row);
      return row as unknown as T;
    },

    update: async <T, D = Partial<T>>(resource: string, id: string, data: D) => {
      const list = rows(resource);
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`[mock] ${resource}/${id} not found`);
      const existing = list[idx]!;
      const updated: Row = { ...existing, ...(data as Record<string, unknown>), id };
      // eslint-disable-next-line security/detect-object-injection -- idx is derived from findIndex (validated above)
      list[idx] = updated;
      return updated as unknown as T;
    },

    delete: async (resource: string, id: string) => {
      const list = rows(resource);
      const idx = list.findIndex((r) => r.id === id);
      if (idx === -1) throw new Error(`[mock] ${resource}/${id} not found`);
      list.splice(idx, 1);
    },
  };
}
