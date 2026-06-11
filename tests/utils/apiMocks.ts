import { API_ENDPOINTS } from '@/core/config/constants.ts';
import type {
  ActivityItem,
  DashboardStat,
  MonthlyChartPoint,
  WeeklyChartPoint,
} from '@/pages/dashboard/dashboard.contracts.ts';
import type { AuthTokenResponse, AuthUser } from '@/shared/auth/types.ts';

/** Base64 to base64url (replace +/ and strip trailing =) without backtracking regex. */
function toBase64UrlNoPadding(base64: string): string {
  const noSlash = base64.replace(/\+/g, '-').replace(/\//g, '_');
  let end = noSlash.length;
  while (end > 0 && noSlash[end - 1] === '=') end--;
  return noSlash.slice(0, end);
}

/**
 * Helper to create a base64url-encoded JWT for testing
 */
function makeJwt(payload: Record<string, unknown>): string {
  const encode = (obj: Record<string, unknown>) =>
    toBase64UrlNoPadding(btoa(JSON.stringify(obj)));
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.dGVzdHNpZw`;
}

/**
 * Default dummy responses for API endpoints
 */
export const mockApiResponses = {
  auth: {
    login: (): AuthTokenResponse => ({
      accessToken: makeJwt({ sub: 'test-user', exp: 9999999999 }),
    }),
    refresh: (): AuthTokenResponse => ({
      accessToken: makeJwt({ sub: 'test-user', exp: 9999999999 }),
    }),
    me: (): AuthUser => ({
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'admin',
      tenantId: 'test-tenant',
      name: 'Test User',
    }),
    logout: (): Record<string, never> => ({}),
  },
  dashboard: {
    stats: (): DashboardStat[] => [
      {
        id: '1',
        title: 'Total Users',
        value: '1,234',
        valueRaw: 1234,
        prefix: '',
        change: '+12.5%',
        trend: 'up',
        description: 'From last month',
        spark: [900, 1000, 1120, 1234],
      },
      {
        id: '2',
        title: 'Active Sessions',
        value: '567',
        valueRaw: 567,
        prefix: '',
        change: '-3.2%',
        trend: 'down',
        description: 'From last week',
        spark: [620, 600, 580, 567],
      },
      {
        id: '3',
        title: 'Revenue',
        value: '$45,678',
        valueRaw: 45678,
        prefix: '$',
        change: '+8.1%',
        trend: 'up',
        description: 'From last quarter',
        spark: [38000, 41000, 43500, 45678],
      },
      {
        id: '4',
        title: 'Conversion Rate',
        value: '3.2%',
        valueRaw: 3.2,
        prefix: '',
        change: '+0.5%',
        trend: 'up',
        description: 'From last month',
        spark: [2.4, 2.7, 3.0, 3.2],
      },
    ],
    activity: (): ActivityItem[] => [
      {
        id: '1',
        user: 'John Doe',
        action: 'created',
        target: 'Organization ABC',
        time: '2 hours ago',
        type: 'create',
      },
      {
        id: '2',
        user: 'Jane Smith',
        action: 'upgraded',
        target: 'Plan Pro',
        time: '5 hours ago',
        type: 'upgrade',
      },
      {
        id: '3',
        user: 'Bob Johnson',
        action: 'invited',
        target: 'user@example.com',
        time: '1 day ago',
        type: 'invite',
      },
    ],
    monthlyChart: (): MonthlyChartPoint[] => [
      { name: 'Jan', users: 100, revenue: 5000 },
      { name: 'Feb', users: 150, revenue: 7500 },
      { name: 'Mar', users: 200, revenue: 10000 },
      { name: 'Apr', users: 250, revenue: 12500 },
      { name: 'May', users: 300, revenue: 15000 },
      { name: 'Jun', users: 350, revenue: 17500 },
    ],
    weeklyChart: (): WeeklyChartPoint[] => [
      { day: 'Mon', signups: 10 },
      { day: 'Tue', signups: 15 },
      { day: 'Wed', signups: 12 },
      { day: 'Thu', signups: 18 },
      { day: 'Fri', signups: 20 },
      { day: 'Sat', signups: 8 },
      { day: 'Sun', signups: 5 },
    ],
  },
};

/**
 * Get mock response for a given URL
 * Used by test utilities to provide dummy API responses
 */
export function getMockResponse(
  url: string,
  method: 'get' | 'post' | 'put' | 'patch' | 'delete' = 'get',
) {
  // Auth endpoints
  if (url.includes(API_ENDPOINTS.AUTH.ME)) {
    return Promise.resolve({ data: mockApiResponses.auth.me() });
  }
  if (method === 'post' && url.includes(API_ENDPOINTS.AUTH.LOGIN)) {
    return Promise.resolve({ data: mockApiResponses.auth.login() });
  }
  if (method === 'post' && url.includes(API_ENDPOINTS.AUTH.REFRESH)) {
    return Promise.resolve({ data: mockApiResponses.auth.refresh() });
  }
  if (method === 'post' && url.includes(API_ENDPOINTS.AUTH.LOGOUT)) {
    return Promise.resolve({ data: mockApiResponses.auth.logout() });
  }

  // Dashboard endpoints
  if (url.includes('/api/dashboard/stats')) {
    return Promise.resolve({ data: mockApiResponses.dashboard.stats() });
  }
  if (url.includes('/api/dashboard/activity')) {
    return Promise.resolve({ data: mockApiResponses.dashboard.activity() });
  }
  if (url.includes('/api/dashboard/charts/monthly')) {
    return Promise.resolve({ data: mockApiResponses.dashboard.monthlyChart() });
  }
  if (url.includes('/api/dashboard/charts/weekly')) {
    return Promise.resolve({ data: mockApiResponses.dashboard.weeklyChart() });
  }

  // Default fallback
  return Promise.resolve({ data: {} });
}
