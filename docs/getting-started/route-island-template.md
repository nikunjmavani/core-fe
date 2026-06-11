# Route island template

Copy for **`pages/<page-name>/`** or **`pages/.../sub-pages/<sub-page-name>/`**. Rules: [route-island-structure.md](../reference/route-island-structure.md).

## Tree

```text
pages/<page-name>/
├── OVERVIEW.md
├── page.ts
├── route.tsx
├── contracts.ts
├── api.ts
├── hooks/
├── components/
├── forms/
├── search.ts              # optional
├── fixtures.ts            # optional
├── __tests__/
│   ├── unit/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── forms/
│   │   ├── api.test.ts
│   │   └── page.test.tsx
│   └── integration/       # optional
└── sub-pages/             # layout only — recursive full tree
    └── <sub-page-name>/
```

## `page.ts`

```ts
import type { PageManifest } from '@/lib/route-island/page-manifest.ts';

export const page = {
  segment: '<page-name>',
  path: '/<path>',
  testId: '<page-name>-page',
  permission: 'resource:read', // or null
  kind: 'leaf', // or 'layout' + children: ['<sub-a>']
  children: [],
} as const satisfies PageManifest;
```

## `route.tsx`

```tsx
import { requirePermission } from '@/core/rbac/guards.ts';

import { ExamplePage } from './components/ExamplePage.tsx';
import { page } from './page.ts';

export function Component() {
  return <ExamplePage />;
}

export function loader() {
  if (page.permission) requirePermission(page.permission);
  return null;
}
```

## `components/ExamplePage.tsx`

```tsx
import { page } from '../page.ts';

export function ExamplePage() {
  return (
    <div className="space-y-6" data-testid={page.testId}>
      <h1 className="text-2xl font-bold tracking-tight">Title</h1>
    </div>
  );
}
```

## `__tests__/unit/page.test.tsx`

```tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';

import { ExamplePage } from '../../components/ExamplePage.tsx';

describe('ExamplePage', () => {
  it('renders', () => {
    render(<ExamplePage />);
    expect(screen.getByTestId('example-page')).toBeInTheDocument();
  });

  it('has no a11y violations', async () => {
    const { container } = render(<ExamplePage />);
    expect(await axe(container)).toHaveNoViolations();
  });
});
```

## `routeTree.tsx`

```ts
lazy: () => import('@/pages/<page-name>/route.tsx'),
// child: lazy: () => import('@/pages/<page-name>/sub-pages/<sub>/route.tsx'),
```
