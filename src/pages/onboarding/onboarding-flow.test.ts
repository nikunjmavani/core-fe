import { describe, expect, it } from 'vitest';

import type { MeContext } from '@/shared/tenancy/me-context.ts';

import {
  deriveOnboardingSteps,
  shouldCreateOrganizationOnFinish,
} from './onboarding-flow.ts';

const BOTH_FLAGS = { personalOrganizations: true, teamOrganizations: true };
const PERSONAL_ONLY = { personalOrganizations: true, teamOrganizations: false };
const TEAM_ONLY = { personalOrganizations: false, teamOrganizations: true };

const CTX_WITH_PERSONAL = {
  personalOrganizationId: 'org_personalij0123456789x',
  organizations: [
    {
      id: 'org_personalij0123456789x',
      type: 'PERSONAL',
      slug: null,
    },
  ],
} as unknown as MeContext;

describe('deriveOnboardingSteps', () => {
  it('skips workspace and invite in personal-only mode', () => {
    expect(deriveOnboardingSteps(PERSONAL_ONLY, CTX_WITH_PERSONAL)).toEqual([
      'welcome',
      'profile',
      'questions',
      'done',
    ]);
  });

  it('requires workspace in team-only mode', () => {
    expect(deriveOnboardingSteps(TEAM_ONLY, null)).toEqual([
      'welcome',
      'profile',
      'questions',
      'workspace',
      'invite',
      'done',
    ]);
  });

  it('skips workspace and invite in both mode when personal org already exists', () => {
    expect(deriveOnboardingSteps(BOTH_FLAGS, CTX_WITH_PERSONAL)).toEqual([
      'welcome',
      'profile',
      'questions',
      'done',
    ]);
  });

  it('includes invite in both mode only when a team org exists', () => {
    expect(
      deriveOnboardingSteps(BOTH_FLAGS, {
        ...CTX_WITH_PERSONAL,
        organizations: [
          ...CTX_WITH_PERSONAL.organizations,
          {
            id: 'org_team',
            type: 'TEAM',
            slug: 'acme',
          },
        ],
      } as unknown as MeContext),
    ).toEqual(['welcome', 'profile', 'questions', 'invite', 'done']);
  });
});

describe('shouldCreateOrganizationOnFinish', () => {
  it('never creates in personal-only mode', () => {
    expect(shouldCreateOrganizationOnFinish(PERSONAL_ONLY, null)).toBe(false);
  });

  it('always creates in team-only mode', () => {
    expect(shouldCreateOrganizationOnFinish(TEAM_ONLY, null)).toBe(true);
  });

  it('never creates in both mode (team orgs come from the switcher)', () => {
    expect(shouldCreateOrganizationOnFinish(BOTH_FLAGS, null)).toBe(false);
    expect(shouldCreateOrganizationOnFinish(BOTH_FLAGS, CTX_WITH_PERSONAL)).toBe(false);
  });
});
