import { useState } from 'react';
import { z } from 'zod';

import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import { Plus, X } from '@/shared/icons/index.ts';
import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

const inviteEmailSchema = z.string().trim().email();

/** Collects optional teammate emails; the final step sends the invitations. */
export function InviteStep() {
  const { data, patch } = useOnboardingStore();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  const add = () => {
    const parsed = inviteEmailSchema.safeParse(email);
    if (!parsed.success) {
      setError('Enter a valid email address.');
      return;
    }
    const trimmed = parsed.data.toLowerCase();
    if (data.invites.includes(trimmed)) {
      setError('That teammate is already on the list.');
      return;
    }
    patch({ invites: [...data.invites, trimmed] });
    setEmail('');
    setError(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-2">
        <div className="flex-1 space-y-2">
          <Label htmlFor="ob-invite">Teammate email</Label>
          <Input
            id="ob-invite"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                add();
              }
            }}
            aria-invalid={!!error}
            placeholder="teammate@company.com"
            data-testid="onboarding-invite-email"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={add}
          data-testid="onboarding-invite-add"
        >
          <Plus className="mr-1 h-4 w-4" />
          Add
        </Button>
      </div>
      {error && (
        <p
          className="text-destructive text-xs"
          role="alert"
          data-testid="onboarding-invite-error"
        >
          {error}
        </p>
      )}
      {data.invites.length > 0 && (
        <ul className="space-y-2" data-testid="onboarding-invite-list">
          {data.invites.map((invite) => (
            <li
              key={invite}
              className="bg-muted/50 flex items-center justify-between rounded-md px-3 py-2 text-sm"
            >
              {invite}
              <button
                type="button"
                aria-label={`Remove ${invite}`}
                onClick={() =>
                  patch({ invites: data.invites.filter((i) => i !== invite) })
                }
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
