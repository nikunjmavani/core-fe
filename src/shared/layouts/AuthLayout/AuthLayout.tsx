import { Link, useLocation } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { cn } from '@/lib/utils.ts';
import { ThemeModeToggle } from '@/shared/components/ThemeModeToggle/index.ts';
import { Boxes, ShieldCheck, Sparkles, Users, Zap } from '@/shared/icons/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';

interface AuthLayoutProps {
  children: ReactNode;
}

const FEATURES = [
  {
    icon: Users,
    title: 'Multi-org by design',
    body: 'Switch teams without switching tools.',
  },
  {
    icon: ShieldCheck,
    title: 'Secure by default',
    body: 'RBAC, MFA, passkeys, and audit trails.',
  },
  {
    icon: Zap,
    title: 'Fast everywhere',
    body: 'Built for keyboard-first, real-time work.',
  },
] as const;

const STATS = [
  { value: '10k+', label: 'teams' },
  { value: '99.99%', label: 'uptime' },
  { value: 'SOC 2', label: 'compliant' },
] as const;

// ── Shared pieces ────────────────────────────────────────────────────────────

function SkipLink() {
  return (
    <a
      href="#main-content"
      className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:underline"
    >
      Skip to main content
    </a>
  );
}

/** Theme toggle + the login/register switch link (shared by every variant). */
function AuthControls() {
  const { pathname } = useLocation();
  const isLogin = pathname === '/login';
  return (
    <div className="flex items-center gap-3">
      <ThemeModeToggle />
      <Link
        to={isLogin ? '/register' : '/login'}
        className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
        data-testid="auth-switch-link"
      >
        {isLogin ? 'Create an account' : 'Sign in'}
      </Link>
    </div>
  );
}

function BrandMark({ className }: { className?: string }) {
  return (
    <Link to="/login" className={cn('flex items-center gap-2.5', className)}>
      <div className="bg-primary text-primary-foreground flex h-9 w-9 items-center justify-center rounded-lg">
        <Boxes className="h-5 w-5" />
      </div>
      <span className="text-lg font-semibold tracking-tight">Core</span>
    </Link>
  );
}

/** The animated form slot — owns `auth-form-container`, re-keyed per route. */
function AuthForm({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div
      key={pathname}
      className="animate-fade-in-up w-full"
      data-testid="auth-form-container"
    >
      {children}
    </div>
  );
}

// ── Variant 0 — Split (default) ──────────────────────────────────────────────

function SplitAuth({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen" data-testid="auth-layout">
      <SkipLink />

      <div className="bg-brand text-brand-foreground relative hidden w-1/2 flex-col overflow-hidden lg:flex xl:w-[55%]">
        <div
          className="from-primary/25 via-primary/5 to-primary/15 absolute inset-0 bg-gradient-to-br"
          aria-hidden="true"
        />
        <svg
          className="text-primary/[0.12] absolute inset-0 h-full w-full"
          aria-hidden="true"
        >
          <defs>
            <pattern id="auth-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
        <div className="bg-primary/30 absolute -top-24 -left-24 h-80 w-80 rounded-full blur-3xl" />
        <div className="bg-primary/20 absolute right-[-10%] bottom-[-15%] h-96 w-96 rounded-full blur-3xl" />
        <div
          className="via-primary/40 absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent to-transparent"
          aria-hidden="true"
        />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          <div className="flex items-center justify-between">
            <BrandMark />
            <span className="border-brand-foreground/15 bg-brand-foreground/5 text-brand-foreground/70 flex items-center gap-2 rounded-full border px-3 py-1 text-xs">
              <span className="relative flex h-2 w-2">
                <span className="bg-success absolute inline-flex h-full w-full animate-ping rounded-full opacity-75" />
                <span className="bg-success relative inline-flex h-2 w-2 rounded-full" />
              </span>
              <span>All systems operational</span>
            </span>
          </div>

          <div className="max-w-md space-y-10">
            <div className="space-y-4">
              <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
                <Sparkles className="h-3 w-3" /> Operations, unified
              </span>
              <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
                The operating system for your organization.
              </h1>
              <p className="text-brand-foreground/60">
                Members, roles, billing, and security — one fast, keyboard-first workspace
                for every team you run.
              </p>
            </div>

            <ul className="space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="bg-primary/15 text-primary ring-primary/25 mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md ring-1">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-brand-foreground/55 text-sm">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="border-primary/20 flex items-center gap-8 border-t pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-xl font-semibold tracking-tight">{s.value}</p>
                <p className="text-brand-foreground/50 text-xs">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-background flex w-full flex-col lg:w-1/2 xl:w-[45%]">
        <div className="flex items-center justify-between p-5 sm:p-6 lg:justify-end">
          <Link
            to="/login"
            className="flex items-center gap-2 lg:hidden"
            data-testid="auth-mobile-logo"
          >
            <div className="bg-primary text-primary-foreground flex h-8 w-8 items-center justify-center rounded-lg">
              <Boxes className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold">Core</span>
          </Link>
          <AuthControls />
        </div>

        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-6"
        >
          <div className="w-full max-w-[400px]">
            <AuthForm>{children}</AuthForm>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Variant 1 — Spotlight (TEMP preview) ─────────────────────────────────────

function SpotlightAuth({ children }: AuthLayoutProps) {
  return (
    <div
      className="bg-brand text-brand-foreground relative flex min-h-screen flex-col overflow-hidden"
      data-testid="auth-layout"
    >
      <SkipLink />
      <div
        className="from-primary/25 via-primary/5 to-primary/20 pointer-events-none absolute inset-0 bg-gradient-to-br"
        aria-hidden="true"
      />
      <div
        className="bg-primary/30 pointer-events-none absolute top-1/2 left-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        aria-hidden="true"
      />

      <header className="relative z-10 flex items-center justify-between p-5 sm:p-6">
        <BrandMark />
        <AuthControls />
      </header>

      <main
        id="main-content"
        className="relative z-10 flex flex-1 items-center justify-center px-5 pb-12 sm:px-6"
      >
        <div className="w-full max-w-[420px]">
          <div className="mb-6 text-center">
            <span className="border-primary/30 bg-primary/10 text-primary inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium">
              <Sparkles className="h-3 w-3" /> Operations, unified
            </span>
          </div>
          <div className="border-border bg-background text-foreground rounded-2xl border p-6 shadow-2xl sm:p-8">
            <AuthForm>{children}</AuthForm>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Variant 2 — Minimal (TEMP preview) ───────────────────────────────────────

function MinimalAuth({ children }: AuthLayoutProps) {
  return (
    <div
      className="bg-background text-foreground flex min-h-screen flex-col"
      data-testid="auth-layout"
    >
      <SkipLink />
      <header className="relative flex items-center justify-between px-5 py-4 sm:px-8">
        <BrandMark />
        <AuthControls />
        <div
          className="via-primary/40 absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent to-transparent"
          aria-hidden="true"
        />
      </header>

      <main
        id="main-content"
        className="flex flex-1 items-center justify-center px-5 py-12 sm:px-6"
      >
        <div className="w-full max-w-[400px]">
          <div className="border-border bg-card rounded-xl border p-6 shadow-sm sm:p-8">
            <div
              className="bg-primary mx-auto mb-6 h-1 w-10 rounded-full"
              aria-hidden="true"
            />
            <AuthForm>{children}</AuthForm>
          </div>
        </div>
      </main>
    </div>
  );
}

/**
 * Auth layout shell for the sign-in / sign-up surfaces.
 *
 * Variant 0 (default) is the split brand panel + form. Variants 1 (spotlight)
 * and 2 (minimal) are TEMP design previews selected by `authVariant`, which
 * Shuffle cycles — so the auth screen restyles as you shuffle the theme. Remove
 * the variants + the `authVariant` store field once a design is chosen.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const variant = useThemeStore((s) => s.authVariant);
  if (variant === 1) return <SpotlightAuth>{children}</SpotlightAuth>;
  if (variant === 2) return <MinimalAuth>{children}</MinimalAuth>;
  return <SplitAuth>{children}</SplitAuth>;
}
