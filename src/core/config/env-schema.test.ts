import {
  branchEnvironmentMap,
  type DeployEnvironment,
  environmentForBranch,
  envProfiles,
  envSchemaConditionallyRequiredKeys,
  envSchemaKeys,
  type ForbiddenKeyRule,
} from './env-schema.ts';

/** Mirrors the validator's forbidden matcher (tooling/validate/client-env.ts). */
function isForbidden(rule: ForbiddenKeyRule, value: string): boolean {
  return rule.valuePattern ? rule.valuePattern.test(value) : true;
}

function forbiddenHits(
  environment: DeployEnvironment,
  committed: Record<string, string>,
): string[] {
  return envProfiles[environment].forbidden
    .filter((rule) => {
      const value = committed[rule.key];
      return value !== undefined && isForbidden(rule, value);
    })
    .map((rule) => rule.key);
}

describe('environmentForBranch', () => {
  it('maps deploying branches to their environment', () => {
    expect(environmentForBranch('dev')).toBe('development');
    expect(environmentForBranch('main')).toBe('production');
  });

  it('returns undefined for feature branches and missing input', () => {
    expect(environmentForBranch('feature/foo')).toBeUndefined();
    expect(environmentForBranch(undefined)).toBeUndefined();
    expect(environmentForBranch('')).toBeUndefined();
  });

  it('stays in lock step with branchEnvironmentMap', () => {
    expect(branchEnvironmentMap).toEqual({ dev: 'development', main: 'production' });
  });
});

describe('envProfiles forbidden keys', () => {
  it('blocks local-only Sonar secrets in every environment', () => {
    for (const environment of ['development', 'production'] as const) {
      expect(forbiddenHits(environment, { SONAR_TOKEN: 'x' })).toContain('SONAR_TOKEN');
      expect(forbiddenHits(environment, { SONAR_ADMIN_PASSWORD: 'x' })).toContain(
        'SONAR_ADMIN_PASSWORD',
      );
    }
  });

  it('blocks a test Stripe key in production but allows a live key', () => {
    expect(
      forbiddenHits('production', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_1' }),
    ).toContain('VITE_STRIPE_PUBLISHABLE_KEY');
    expect(
      forbiddenHits('production', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_1' }),
    ).toEqual([]);
  });

  it('blocks a live Stripe key in development but allows a test key', () => {
    expect(
      forbiddenHits('development', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_live_1' }),
    ).toContain('VITE_STRIPE_PUBLISHABLE_KEY');
    expect(
      forbiddenHits('development', { VITE_STRIPE_PUBLISHABLE_KEY: 'pk_test_1' }),
    ).toEqual([]);
  });
});

describe('envProfiles required keys', () => {
  it('requires Turnstile in production only when captcha is enabled', () => {
    const rule = envProfiles.production.required.find(
      (r) => r.key === 'VITE_TURNSTILE_SITE_KEY',
    );
    expect(rule).toBeDefined();
    expect(rule?.level).toBe('error');
    expect(rule?.when?.(() => undefined)).toBe(true);
    expect(
      rule?.when?.((key) => (key === 'VITE_CAPTCHA_DISABLED' ? 'true' : undefined)),
    ).toBe(false);
  });

  it('derives the conditionally-required list from the production profile', () => {
    const keys = envSchemaConditionallyRequiredKeys.map((entry) => entry.key);
    expect(keys).toEqual(['VITE_TURNSTILE_SITE_KEY', 'VITE_API_BASE_URL']);
    for (const entry of envSchemaConditionallyRequiredKeys) {
      expect(entry.condition.length).toBeGreaterThan(0);
    }
  });
});

describe('envSchemaKeys', () => {
  it('includes the Stripe publishable key', () => {
    expect(envSchemaKeys).toContain('VITE_STRIPE_PUBLISHABLE_KEY');
  });

  it('includes the local Sonar tooling secrets', () => {
    expect(envSchemaKeys).toContain('SONAR_TOKEN');
    expect(envSchemaKeys).toContain('SONAR_ADMIN_PASSWORD');
  });
});
