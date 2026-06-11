import * as Sentry from '@sentry/react';

import { AppError } from '@/shared/errors/AppError.ts';
import { isHttpError } from '@/shared/errors/HttpError.ts';
import { useAuthStore } from '@/shared/store/useAuthStore/index.ts';
import { useTenantStore } from '@/shared/store/useTenantStore/index.ts';

/**
 * Global error handler — reports errors to Sentry with user/tenant context.
 * Only sends user.id for identification (no email/PII).
 */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  const user = useAuthStore.getState().user;
  const tenant = useTenantStore.getState();

  Sentry.withScope((scope) => {
    if (user) {
      // Only send user ID — no PII (email, name) to Sentry
      scope.setUser({ id: user.id });
    }

    if (tenant.tenantId) {
      scope.setTag('tenant_id', tenant.tenantId);
      scope.setTag('tenant_slug', tenant.tenantSlug ?? 'unknown');
    }

    if (context) {
      scope.setExtras(context);
    }

    if (error instanceof AppError) {
      scope.setTag('error_code', error.code);
      scope.setExtra('status_code', error.statusCode);
    }

    if (isHttpError(error)) {
      scope.setExtra('url', error.url);
      scope.setExtra('method', error.method);
      scope.setExtra('status', error.status);
      // Do NOT log response body — may contain PII
    }

    Sentry.captureException(error);
  });
}

const HTTP_STATUS_MESSAGES: Record<number, string> = {
  400: 'The request was invalid. Please check your input and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have permission to perform this action.',
  404: 'The requested resource was not found.',
  409: 'A conflict occurred. The resource may have been modified by someone else.',
  422: 'The submitted data is invalid. Please review and try again.',
  429: 'Too many requests. Please wait a moment and try again.',
  500: 'An internal server error occurred. Please try again later.',
  502: 'The server is temporarily unavailable. Please try again later.',
  503: 'The service is temporarily unavailable. Please try again later.',
};

const SQL_RE = /\b(select|insert|update|delete|drop|union|where)\b/i;
const PATH_RE = /[/\\]{2,}/;
const STACK_RE = /\.\w{2,4}:\d+/;

/**
 * Sanitize a server-provided error message.
 * Rejects messages that look like leaked internals (SQL, stack traces, file paths).
 */
function sanitizeServerMessage(message: string, status: number): string {
  /* eslint-disable security/detect-object-injection -- status is validated HTTP status code */
  const fallback =
    HTTP_STATUS_MESSAGES[status] ?? 'Something went wrong. Please try again.';
  /* eslint-enable security/detect-object-injection */
  if (message.length > 200) return fallback;
  if (SQL_RE.test(message) || PATH_RE.test(message) || STACK_RE.test(message))
    return fallback;
  return message;
}

/**
 * Extract a user-friendly message from an error.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }

  if (isHttpError(error)) {
    const data = error.data as { message?: string } | undefined;
    const serverMessage = data?.message;
    if (typeof serverMessage === 'string') {
      return sanitizeServerMessage(serverMessage, error.status);
    }
    return (
      HTTP_STATUS_MESSAGES[error.status] ?? 'Something went wrong. Please try again.'
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred';
}
