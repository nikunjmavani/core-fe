import { describe, expect, it, vi } from 'vitest';

import { AppError } from './AppError.ts';
import { getErrorMessage, reportError } from './errorHandler.ts';
import { HttpError } from './HttpError.ts';

vi.mock('@sentry/react', () => ({
  withScope: vi.fn((cb: (scope: unknown) => void) => {
    const scope = {
      setUser: vi.fn(),
      setTag: vi.fn(),
      setExtra: vi.fn(),
      setExtras: vi.fn(),
    };
    cb(scope);
  }),
  captureException: vi.fn(),
}));

vi.mock('@/shared/store/useAuthStore/index.ts', () => ({
  useAuthStore: { getState: () => ({ user: null }) },
}));

vi.mock('@/shared/store/useOrganizationStore/index.ts', () => ({
  useOrganizationStore: {
    getState: () => ({ organizationId: null, organizationSlug: null }),
  },
}));

describe('getErrorMessage', () => {
  it('returns AppError message as-is', () => {
    const err = new AppError('Custom error', 400, 'BAD_REQUEST');
    expect(getErrorMessage(err)).toBe('Custom error');
  });

  it('returns sanitized server message for HttpError', () => {
    const err = new HttpError('Bad Request', 400, '/api/test', 'POST', {
      message: 'Email is required',
    });
    expect(getErrorMessage(err)).toBe('Email is required');
  });

  it('rejects server messages containing SQL keywords', () => {
    const err = new HttpError('Bad Request', 400, '/api/test', 'POST', {
      message: 'SELECT * FROM users WHERE id = 1',
    });
    expect(getErrorMessage(err)).toBe(
      'The request was invalid. Please check your input and try again.',
    );
  });

  it('rejects server messages containing stack traces', () => {
    const err = new HttpError('Server Error', 500, '/api/test', 'GET', {
      message: 'TypeError: cannot read property at handler.ts:42',
    });
    expect(getErrorMessage(err)).toBe(
      'An internal server error occurred. Please try again later.',
    );
  });

  it('rejects server messages longer than 200 characters', () => {
    const err = new HttpError('Bad Request', 400, '/api/test', 'POST', {
      message: 'x'.repeat(201),
    });
    expect(getErrorMessage(err)).toBe(
      'The request was invalid. Please check your input and try again.',
    );
  });

  it('returns status-based fallback for HttpError without data.message', () => {
    const err = new HttpError('Not Found', 404, '/api/test', 'GET');
    expect(getErrorMessage(err)).toBe('The requested resource was not found.');
  });

  it('returns generic fallback for unknown HTTP status', () => {
    const err = new HttpError('Teapot', 418, '/api/test', 'GET');
    expect(getErrorMessage(err)).toBe('Something went wrong. Please try again.');
  });

  it('returns Error.message for generic errors', () => {
    expect(getErrorMessage(new Error('Network failure'))).toBe('Network failure');
  });

  it('returns fallback for non-Error values', () => {
    expect(getErrorMessage('string error')).toBe('An unexpected error occurred');
    expect(getErrorMessage(null)).toBe('An unexpected error occurred');
    expect(getErrorMessage(42)).toBe('An unexpected error occurred');
  });
});

describe('reportError', () => {
  it('calls Sentry.captureException without throwing', () => {
    expect(() => reportError(new Error('test'))).not.toThrow();
  });

  it('handles AppError with code and statusCode', () => {
    expect(() => reportError(new AppError('fail', 500, 'INTERNAL'))).not.toThrow();
  });

  it('handles HttpError with request context', () => {
    expect(() =>
      reportError(new HttpError('Not Found', 404, '/api/x', 'GET')),
    ).not.toThrow();
  });
});
