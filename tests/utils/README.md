# Test Utilities

## renderWithProviders

Renders a component with all necessary providers (TanStack Query, React Router).

```tsx
import { renderWithProviders } from '@/tests/utils/renderWithProviders.tsx';

test('renders component', () => {
  const { getByText } = renderWithProviders(<MyComponent />);
  expect(getByText('Hello')).toBeInTheDocument();
});
```

### Options

- `initialEntries?: string[]` - Initial route entries for MemoryRouter (default: `['/']`)
- `queryClient?: QueryClient` - Custom QueryClient (default: fresh test client with no retries)
- `mockApi?: boolean` - If true, mocks apiClient with dummy API responses (default: `false`)

### With API Mocking

```tsx
test('renders with API data', () => {
  const { getByText } = renderWithProviders(<DashboardPage />, { mockApi: true });
  // apiClient calls will return dummy responses from mockApiResponses
  expect(getByText('Total Users')).toBeInTheDocument();
});
```

## mockApiResponses

Pre-defined dummy API responses for common endpoints.

```tsx
import { mockApiResponses } from '@/tests/utils/apiMocks.ts';

// Use in tests that need specific mock data
const mockUser = mockApiResponses.auth.me();
const mockStats = mockApiResponses.dashboard.stats();
```

Available responses:

- `auth.login()` - Returns mock login token response
- `auth.refresh()` - Returns mock refresh token response
- `auth.me()` - Returns mock user object
- `auth.logout()` - Returns empty object
- `dashboard.stats()` - Returns array of dashboard stats
- `dashboard.activity()` - Returns array of activity items
- `dashboard.monthlyChart()` - Returns monthly chart data
- `dashboard.weeklyChart()` - Returns weekly chart data

## getMockResponse

Get a mock response for a given URL and HTTP method.

```tsx
import { getMockResponse } from '@/tests/utils/apiMocks.ts';

const response = await getMockResponse('/api/dashboard/stats', 'get');
```

## mockApiClient

Create a mocked apiClient instance for tests.

```tsx
import { mockApiClient } from '@/tests/utils/mockApiClient.ts';

const { instance, mocks } = mockApiClient();
// Use instance as apiClient replacement
// Access mocks.get, mocks.post, etc. for assertions
```

## mockAxios

Mock axios for tests that use raw axios (like auth service).

```tsx
import { mockAxios } from '@/tests/utils/mockApiClient.ts';

const { mocks } = mockAxios();
// axios.get, axios.post, etc. are now mocked
```
