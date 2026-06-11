import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';

import { ProfileForm } from './ProfileForm.tsx';

describe('ProfileForm', () => {
  it('renders profile fields', () => {
    render(<ProfileForm email="jane@example.com" defaultValues={{ name: 'Jane' }} />);
    expect(screen.getByTestId('profile-form')).toBeInTheDocument();
    expect(screen.getByTestId('profile-name')).toBeInTheDocument();
    expect(screen.getByTestId('profile-email')).toBeInTheDocument();
    expect(screen.getByTestId('profile-bio')).toBeInTheDocument();
    expect(screen.getByTestId('profile-timezone')).toBeInTheDocument();
    expect(screen.getByTestId('profile-submit')).toBeInTheDocument();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <ProfileForm email="jane@example.com" defaultValues={{ name: 'Jane' }} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
