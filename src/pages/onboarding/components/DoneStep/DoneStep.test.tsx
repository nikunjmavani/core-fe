import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

const flagsRef = vi.hoisted(() => ({
  value: { personalOrganizations: false, teamOrganizations: true },
}));
vi.mock('@/shared/hooks/useDeploymentFlags/index.ts', () => ({
  useDeploymentFlags: () => flagsRef.value,
}));
vi.mock('@/shared/hooks/useMeContext/index.ts', () => ({
  useMeContext: () => ({ data: null, isPending: false, isError: false }),
}));

import { DoneStep } from './DoneStep.tsx';

describe('DoneStep', () => {
  beforeEach(() => {
    useOnboardingStore.getState().reset();
  });

  it('summarizes the collected onboarding data (team-only flow)', () => {
    flagsRef.value = { personalOrganizations: false, teamOrganizations: true };
    useOnboardingStore.getState().patch({ organizationName: 'Acme Inc.' });
    render(<DoneStep />);
    expect(screen.getByText('Acme Inc.')).toBeInTheDocument();
    expect(screen.getByText(/pending/i)).toBeInTheDocument(); // invite step runs
  });

  it('hides the organization and invite rows when the flow never collected them (hybrid, no team)', () => {
    // personal-and-team with no team membership: steps are
    // welcome/profile/questions/done — no workspace step, no invite step.
    flagsRef.value = { personalOrganizations: true, teamOrganizations: true };
    useOnboardingStore.getState().patch({ firstName: 'Ada', lastName: 'Lovelace' });
    render(<DoneStep />);
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument();
    // No dangling "Organization: —" for a value this flow never asked for.
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText(/pending/i)).not.toBeInTheDocument();
  });

  it('hides the organization row in personal-only mode too', () => {
    flagsRef.value = { personalOrganizations: true, teamOrganizations: false };
    useOnboardingStore.getState().patch({ firstName: 'Solo' });
    render(<DoneStep />);
    expect(screen.getByText('Solo')).toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
  });
});
