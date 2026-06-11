import { Link, useLocation } from '@tanstack/react-router';
import { Boxes, ShieldCheck, Sparkles, Users, Zap } from 'lucide-react';
import type { ReactNode } from 'react';

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

/**
 * Unified auth layout — an innovative split screen.
 *
 * Left: a fixed black brand panel (consistent in light & dark) with an animated
 * dot grid, feature highlights, and live stats. Right: the centered auth form.
 * On mobile the brand panel collapses and only the form (with a compact logo) shows.
 */
export function AuthLayout({ children }: AuthLayoutProps) {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  return (
    <div className="flex min-h-screen" data-testid="auth-layout">
      <a
        href="#main-content"
        className="focus:bg-background focus:text-foreground sr-only focus:not-sr-only focus:absolute focus:z-50 focus:p-4 focus:underline"
      >
        Skip to main content
      </a>

      {/* ── Left brand panel (hidden on mobile) ── */}
      <div className="relative hidden w-1/2 flex-col overflow-hidden bg-neutral-950 text-neutral-50 lg:flex xl:w-[55%]">
        {/* Dot grid */}
        <svg
          className="absolute inset-0 h-full w-full text-white/[0.07]"
          aria-hidden="true"
        >
          <defs>
            <pattern id="auth-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="1.5" cy="1.5" r="1.5" fill="currentColor" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#auth-dots)" />
        </svg>
        {/* Soft monochrome orbs */}
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute right-[-10%] bottom-[-15%] h-96 w-96 rounded-full bg-white/[0.06] blur-3xl" />

        <div className="relative z-10 flex flex-1 flex-col justify-between p-10 xl:p-14">
          {/* Logo + status */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-neutral-950">
                <Boxes className="h-5 w-5" />
              </div>
              <span className="text-lg font-semibold tracking-tight">Core</span>
            </div>
            <span className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs text-white/70">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
              </span>
              All systems operational
            </span>
          </div>

          {/* Headline + features */}
          <div className="max-w-md space-y-10">
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1 text-xs font-medium text-white/70">
                <Sparkles className="h-3 w-3" /> Operations, unified
              </span>
              <h1 className="text-4xl leading-[1.1] font-semibold tracking-tight text-balance xl:text-5xl">
                The operating system for your organization.
              </h1>
              <p className="text-white/60">
                Members, roles, billing, and security — one fast, keyboard-first workspace
                for every team you run.
              </p>
            </div>

            <ul className="space-y-4">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-white/15 bg-white/5">
                    <f.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-sm text-white/55">{f.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-8 border-t border-white/10 pt-6">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="text-xl font-semibold tracking-tight">{s.value}</p>
                <p className="text-xs text-white/50">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Right auth form ── */}
      <div className="bg-background flex w-full flex-col lg:w-1/2 xl:w-[45%]">
        <div className="flex items-center justify-between p-5 sm:p-6 lg:justify-end">
          {/* Mobile logo */}
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

          <Link
            to={isLogin ? '/register' : '/login'}
            className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
            data-testid="auth-switch-link"
          >
            {isLogin ? 'Create an account' : 'Sign in'}
          </Link>
        </div>

        <main
          id="main-content"
          className="flex flex-1 items-center justify-center px-5 pb-12 sm:px-6"
        >
          <div
            key={location.pathname}
            className="animate-fade-in-up w-full max-w-[400px]"
            data-testid="auth-form-container"
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
