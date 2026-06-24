import { Link } from '@tanstack/react-router';

import { Badge } from '@/shared/components/ui/badge.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Skeleton } from '@/shared/components/ui/skeleton.tsx';
import { useMeContext } from '@/shared/hooks/useMeContext/index.ts';
import type { LucideIcon } from '@/shared/icons/index.ts';
import {
  Boxes,
  Building2,
  ChevronRight,
  Settings,
  ShieldCheck,
  UserPlus,
  Users,
  Zap,
} from '@/shared/icons/index.ts';
import type {
  MeContext,
  OrganizationStatusValue,
  OrganizationSummary,
} from '@/shared/tenancy/me-context.ts';

function statusDotClass(status: OrganizationStatusValue): string {
  if (status === 'SUSPENDED') return 'bg-destructive';
  if (status === 'ARCHIVED') return 'bg-muted-foreground';
  return 'bg-success';
}

function StatCard({
  icon: Icon,
  label,
  value,
  testId,
}: {
  icon: LucideIcon;
  label: string;
  value: string | number;
  testId: string;
}) {
  return (
    <Card data-testid={testId} className="hover:border-primary/30 transition-colors">
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <CardDescription>{label}</CardDescription>
        <Icon className="text-muted-foreground h-4 w-4" aria-hidden="true" />
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  );
}

function ActionCard({
  href,
  icon: Icon,
  title,
  description,
  testId,
}: {
  href: string;
  icon: LucideIcon;
  title: string;
  description: string;
  testId: string;
}) {
  return (
    <a
      href={href}
      data-testid={testId}
      className="group bg-card text-card-foreground hover:border-primary/40 hover:bg-accent focus-visible:ring-ring flex items-center gap-3 rounded-xl border p-4 transition-colors focus-visible:ring-2 focus-visible:outline-none"
    >
      <span className="bg-muted text-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{title}</span>
        <span className="text-muted-foreground block truncate text-sm">
          {description}
        </span>
      </span>
      <ChevronRight
        className="text-muted-foreground group-hover:text-foreground h-4 w-4 shrink-0"
        aria-hidden="true"
      />
    </a>
  );
}

/** Open-workspace action for an org in the "Your organizations" list (FE-22). */
function OrgOpenAction({ org }: { org: OrganizationSummary & { isActive: boolean } }) {
  if (org.isActive) return <Badge variant="outline">Current</Badge>;
  const className = 'text-primary text-sm font-medium hover:underline';
  // Team orgs open at their slug URL; a personal org (no slug) returns to root.
  if (org.slug) {
    return (
      <Link
        to="/organization/$organizationSlug/dashboard"
        params={{ organizationSlug: org.slug }}
        className={className}
        data-testid="dashboard-org-open"
      >
        Open workspace →
      </Link>
    );
  }
  return (
    <Link to="/dashboard" className={className} data-testid="dashboard-org-open">
      Open workspace →
    </Link>
  );
}

function DashboardSkeleton() {
  return (
    <div data-testid="dashboard-page" className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48 max-w-full" />
        <Skeleton className="h-4 w-32 max-w-full" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

function QuickActions({ ctx }: { ctx: MeContext }) {
  const caps = ctx.activeOrganization?.capabilities;
  const orgName = ctx.activeOrganization?.name ?? 'your workspace';
  return (
    <section aria-label="Quick actions" className="space-y-3">
      <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
        Quick actions
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {caps?.canInviteMembers && (
          <ActionCard
            href="#settings/organization/members"
            icon={UserPlus}
            title="Invite members"
            description={`Add teammates to ${orgName}`}
            testId="dashboard-action-invite"
          />
        )}
        {caps?.canManageRoles && (
          <ActionCard
            href="#settings/organization/roles"
            icon={ShieldCheck}
            title="Manage roles"
            description="Define who can do what"
            testId="dashboard-action-roles"
          />
        )}
        {caps?.canManageBilling && (
          <ActionCard
            href="#settings/organization/billing"
            icon={Zap}
            title="Billing & plan"
            description="Subscription and invoices"
            testId="dashboard-action-billing"
          />
        )}
        <ActionCard
          href="#settings/organization/general"
          icon={Settings}
          title="Organization settings"
          description="Name, branding, and more"
          testId="dashboard-action-org-settings"
        />
        <ActionCard
          href="#settings/account/profile"
          icon={Users}
          title="Your account"
          description="Profile, security, sessions"
          testId="dashboard-action-account"
        />
      </div>
    </section>
  );
}

/**
 * Workspace dashboard — the landing surface after sign-in. Reads the session
 * context (`useMeContext`) and renders an overview + capability-gated quick
 * actions. Personal organizations show a lighter set (no member/role/billing
 * management); team organizations surface the full toolkit. Shared so both the
 * personal (`/dashboard`) and team route spaces render the same surface (FE-20).
 */
export function Dashboard() {
  const { data: ctx, isLoading, isError } = useMeContext();

  if (isLoading) return <DashboardSkeleton />;

  if (isError || !ctx) {
    return (
      <div data-testid="dashboard-page" className="space-y-2">
        <h1
          className="text-2xl font-bold tracking-tight"
          data-testid="dashboard-greeting"
        >
          Dashboard
        </h1>
        <p className="text-muted-foreground text-sm" data-testid="dashboard-error">
          We couldn&apos;t load your workspace. Please refresh to try again.
        </p>
      </div>
    );
  }

  const org = ctx.activeOrganization;
  const isTeam = org?.type === 'TEAM';
  const firstName = ctx.user.firstName ?? ctx.user.email.split('@')[0] ?? 'there';

  return (
    <div data-testid="dashboard-page" className="space-y-8">
      <header className="space-y-1">
        <h1
          data-testid="dashboard-greeting"
          className="text-2xl font-bold tracking-tight sm:text-3xl"
        >
          Welcome back, {firstName}
        </h1>
        <div className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <Building2 className="h-4 w-4" aria-hidden="true" />
          <span className="text-foreground font-medium" data-testid="dashboard-org-name">
            {org?.name ?? 'Your workspace'}
          </span>
          <Badge variant="secondary">{isTeam ? 'Team' : 'Personal'}</Badge>
          {org && (
            <span
              className="inline-flex items-center gap-1.5"
              data-testid="dashboard-org-status"
            >
              <span
                className={`size-2 rounded-full ${statusDotClass(org.status)}`}
                aria-hidden="true"
              />
              <span className="capitalize">{org.status.toLowerCase()}</span>
            </span>
          )}
        </div>
      </header>

      <section aria-label="Overview" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Boxes}
          label="Workspaces"
          value={ctx.organizations.length}
          testId="dashboard-stat-workspaces"
        />
        <StatCard
          icon={ShieldCheck}
          label="Your permissions"
          value={ctx.myPermissions.length}
          testId="dashboard-stat-permissions"
        />
        <StatCard
          icon={Building2}
          label="Workspace type"
          value={isTeam ? 'Team' : 'Personal'}
          testId="dashboard-stat-type"
        />
        <StatCard
          icon={Zap}
          label="Billing"
          value={org?.capabilities.canManageBilling ? 'Managed' : '—'}
          testId="dashboard-stat-billing"
        />
      </section>

      <QuickActions ctx={ctx} />

      {ctx.organizations.length > 1 && (
        <section aria-label="Your organizations" className="space-y-3">
          <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
            Your organizations
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ctx.organizations.map((o) => (
              <Card key={o.id} data-testid="dashboard-org-item">
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="truncate text-base">{o.name}</CardTitle>
                  <Badge variant={o.type === 'TEAM' ? 'secondary' : 'outline'}>
                    {o.type === 'TEAM' ? 'Team' : 'Personal'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <OrgOpenAction org={o} />
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
