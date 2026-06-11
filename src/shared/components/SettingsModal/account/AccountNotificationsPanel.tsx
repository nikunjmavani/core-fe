import { useState } from 'react';

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

const CHANNELS = [
  {
    id: 'product-updates',
    label: 'Product updates',
    description: 'New features and improvements.',
  },
  {
    id: 'security-alerts',
    label: 'Security alerts',
    description: 'Unusual sign-ins, password changes, and other safety events.',
  },
  {
    id: 'team-activity',
    label: 'Team activity',
    description: 'Member joins, role changes, and invitations.',
  },
  {
    id: 'billing-receipts',
    label: 'Billing & receipts',
    description: 'Invoices, plan changes, and renewal reminders.',
  },
] as const;

/**
 * Notifications section — per-channel email preferences.
 *
 * REPLACE_WITH_API: GET / PATCH /api/v1/users/me/notifications
 */
export function AccountNotificationsPanel() {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    'product-updates': true,
    'security-alerts': true,
    'team-activity': true,
    'billing-receipts': true,
  });

  return (
    <div className="space-y-6" data-testid="settings-section-notifications">
      <SectionHeader
        title="Notifications"
        description="Choose which emails you receive from us."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email channels</CardTitle>
          <CardDescription>Sent to your account email.</CardDescription>
        </CardHeader>
        <CardContent className="divide-y">
          {CHANNELS.map((channel) => (
            <div
              key={channel.id}
              className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
            >
              <div className="space-y-0.5">
                <Label htmlFor={`notify-${channel.id}`} className="text-sm font-medium">
                  {channel.label}
                </Label>
                <p className="text-muted-foreground text-xs">{channel.description}</p>
              </div>
              <Switch
                id={`notify-${channel.id}`}
                checked={prefs[channel.id] ?? false}
                onCheckedChange={(v) =>
                  setPrefs((prev) => ({ ...prev, [channel.id]: v }))
                }
                data-testid={`notify-${channel.id}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
