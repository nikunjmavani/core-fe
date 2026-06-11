import { describe, expect, it } from 'vitest';

import { createMockDataProvider } from './mock-data-provider.ts';

interface User {
  id: string;
  name: string;
  role: 'admin' | 'member';
}

describe('createMockDataProvider', () => {
  it('seeds and lists rows', async () => {
    const dp = createMockDataProvider({
      users: [
        { id: 'u1', name: 'Alice', role: 'admin' },
        { id: 'u2', name: 'Bob', role: 'member' },
      ],
    });
    const result = await dp.getList<User>('users');
    expect(result.total).toBe(2);
    expect(result.data.map((u) => u.id)).toEqual(['u1', 'u2']);
  });

  it('filters by exact match', async () => {
    const dp = createMockDataProvider({
      users: [
        { id: 'u1', name: 'Alice', role: 'admin' },
        { id: 'u2', name: 'Bob', role: 'member' },
      ],
    });
    const result = await dp.getList<User>('users', { filters: { role: 'admin' } });
    expect(result.total).toBe(1);
    expect(result.data[0]?.id).toBe('u1');
  });

  it('sorts ascending and descending', async () => {
    const dp = createMockDataProvider({
      users: [
        { id: 'u1', name: 'Bob', role: 'member' },
        { id: 'u2', name: 'Alice', role: 'admin' },
      ],
    });
    const asc = await dp.getList<User>('users', {
      sort: { field: 'name', order: 'asc' },
    });
    expect(asc.data.map((u) => u.name)).toEqual(['Alice', 'Bob']);
    const desc = await dp.getList<User>('users', {
      sort: { field: 'name', order: 'desc' },
    });
    expect(desc.data.map((u) => u.name)).toEqual(['Bob', 'Alice']);
  });

  it('paginates', async () => {
    const dp = createMockDataProvider({
      users: Array.from({ length: 7 }, (_, i) => ({
        id: `u${i + 1}`,
        name: `User ${i + 1}`,
        role: 'member' as const,
      })),
    });
    const result = await dp.getList<User>('users', {
      pagination: { page: 2, perPage: 3 },
    });
    expect(result.total).toBe(7);
    expect(result.data.map((u) => u.id)).toEqual(['u4', 'u5', 'u6']);
  });

  it('getOne returns a row by id', async () => {
    const dp = createMockDataProvider({
      users: [{ id: 'u1', name: 'Alice', role: 'admin' }],
    });
    expect((await dp.getOne<User>('users', 'u1')).name).toBe('Alice');
  });

  it('getOne throws on missing id', async () => {
    const dp = createMockDataProvider({ users: [] });
    await expect(dp.getOne<User>('users', 'missing')).rejects.toThrow('not found');
  });

  it('create assigns a new id and persists', async () => {
    const dp = createMockDataProvider();
    const created = await dp.create<User>('users', {
      name: 'Charlie',
      role: 'member',
    });
    expect(created.id).toMatch(/^mock-/);
    const result = await dp.getList<User>('users');
    expect(result.total).toBe(1);
  });

  it('update merges data and keeps id', async () => {
    const dp = createMockDataProvider({
      users: [{ id: 'u1', name: 'Alice', role: 'admin' }],
    });
    const updated = await dp.update<User>('users', 'u1', { name: 'Alice Z.' });
    expect(updated).toEqual({ id: 'u1', name: 'Alice Z.', role: 'admin' });
  });

  it('delete removes the row', async () => {
    const dp = createMockDataProvider({
      users: [{ id: 'u1', name: 'Alice', role: 'admin' }],
    });
    await dp.delete('users', 'u1');
    const result = await dp.getList<User>('users');
    expect(result.total).toBe(0);
  });
});
