import { Fingerprint, Laptop, Smartphone, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { Badge } from '@/shared/components/ui/badge.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/components/ui/card.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { Switch } from '@/shared/components/ui/switch.tsx';

import { SectionHeader } from '../SettingsPanelShell.tsx';

// REPLACE_WITH_API: GET /api/v1/users/me/sessions
const SESSIONS = [
  {
    id: 's1',
    device: 'MacBook Pro',
    browser: 'Chrome · San Francisco',
    current: true,
    icon: Laptop,
  },
  {
    id: 's2',
    device: 'iPhone 15',
    browser: 'Safari · San Francisco',
    current: false,
    icon: Smartphone,
  },
];

// REPLACE_WITH_API: GET /api/v1/users/me/passkeys
const PASSKEYS = [
  { id: 'p1', name: 'MacBook Touch ID', createdAt: '2026-02-10T10:00:00.000Z' },
];

/**
 * Security section — multi-factor authentication, passkeys, and active
 * sessions. Backed by mock data until the auth backend is wired.
 */
export function AccountSecurityPanel() {
  const [mfaEnabled, setMfaEnabled] = useState(false);

  return (
    <div className="space-y-6" data-testid="settings-section-security">
      <SectionHeader
        title="Security"
        description="Two-factor authentication, passkeys, and active sessions."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security with an authenticator app.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="mfa-toggle">Require a code at sign-in</Label>
            <Switch
              id="mfa-toggle"
              checked={mfaEnabled}
              onCheckedChange={(v) => {
                setMfaEnabled(v);
                toast.success(v ? 'MFA enabled' : 'MFA disabled');
              }}
              data-testid="mfa-toggle"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Passkeys</CardTitle>
              <CardDescription>
                Sign in without a password using your device.
              </CardDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => toast.success('Passkey registration started (mock)')}
              data-testid="add-passkey"
            >
              <Fingerprint className="mr-2 h-4 w-4" />
              Add passkey
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {PASSKEYS.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
            >
              <div className="flex items-center gap-2 text-sm">
                <Fingerprint className="text-muted-foreground h-4 w-4" />
                {pk.name}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={`Remove ${pk.name}`}
                onClick={() => toast.success('Passkey removed (mock)')}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active sessions</CardTitle>
          <CardDescription>Devices currently signed in to your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {SESSIONS.map((session) => (
            <div
              key={session.id}
              className="flex items-center justify-between rounded-md border px-3 py-2"
              data-testid={`session-${session.id}`}
            >
              <div className="flex items-center gap-3">
                <session.icon className="text-muted-foreground h-5 w-5" />
                <div>
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {session.device}
                    {session.current && <Badge variant="success">This device</Badge>}
                  </p>
                  <p className="text-muted-foreground text-xs">{session.browser}</p>
                </div>
              </div>
              {!session.current && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toast.success('Session revoked (mock)')}
                >
                  Revoke
                </Button>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
