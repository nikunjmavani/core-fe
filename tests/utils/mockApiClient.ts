import { vi } from 'vitest';

import { getMockResponse } from './apiMocks.ts';

/**
 * Mock apiClient for tests that need dummy API responses.
 * Matches the fetch-client API: get/post/put/patch/delete return Promise<{ data: T }>.
 */
export function mockApiClient() {
  const mockGet = vi.fn((url: string) => getMockResponse(url, 'get'));
  const mockPost = vi.fn((url: string, _data?: unknown) => getMockResponse(url, 'post'));
  const mockPut = vi.fn((url: string, _data?: unknown) => getMockResponse(url, 'put'));
  const mockPatch = vi.fn((url: string, _data?: unknown) =>
    getMockResponse(url, 'patch'),
  );
  const mockDelete = vi.fn((url: string) => getMockResponse(url, 'delete'));

  const mockInstance = {
    get: mockGet,
    post: mockPost,
    put: mockPut,
    patch: mockPatch,
    delete: mockDelete,
  };

  return {
    instance: mockInstance,
    mocks: {
      get: mockGet,
      post: mockPost,
      put: mockPut,
      patch: mockPatch,
      delete: mockDelete,
    },
  };
}
