import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import {
  createOrganization,
  type CreateOrganizationInput,
  createOrganizationSchema,
} from '@/shared/api/my-orgs.ts';
import { getMyPermissions } from '@/shared/api/organization-api.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import {
  persistTenantToStorage,
  useTenantStore,
} from '@/shared/store/useTenantStore/index.ts';

interface CreateOrganizationDialogProps {
  /** Custom trigger element; defaults to a "New organization" button. Omit when controlled. */
  trigger?: ReactNode;
  /** Controlled open state. When provided, the dialog is controlled by the parent. */
  open?: boolean;
  /** Controlled open-change handler. */
  onOpenChange?: (open: boolean) => void;
}

/**
 * Dialog to create a new organization from anywhere in the app shell. On
 * success it switches the active tenant, resolves permissions, refreshes the org
 * list, and navigates to the dashboard. Works uncontrolled (with a trigger) or
 * controlled (via `open` / `onOpenChange`).
 */
export function CreateOrganizationDialog({
  trigger,
  open: controlledOpen,
  onOpenChange,
}: CreateOrganizationDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = (value: boolean) => {
    if (isControlled) onOpenChange?.(value);
    else setUncontrolledOpen(value);
  };
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateOrganizationInput>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: { name: '', slug: '' },
  });

  const onSubmit = async (data: CreateOrganizationInput) => {
    const org = await createOrganization({
      name: data.name,
      slug: data.slug?.trim() || undefined,
    });
    const tenant = useTenantStore.getState();
    tenant.setTenant(org.id, org.slug);
    persistTenantToStorage(org.id, org.slug);
    tenant.setPermissions(await getMyPermissions());
    await queryClient.invalidateQueries({ queryKey: ['organizations'] });
    toast.success(`Created ${org.name}`);
    reset();
    setOpen(false);
    navigate({ to: '/', replace: true });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {!isControlled && (
        <DialogTrigger asChild>
          {trigger ?? (
            <Button size="sm" data-testid="create-org-open">
              <Plus className="mr-2 h-4 w-4" />
              New organization
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create organization</DialogTitle>
          <DialogDescription>
            Spin up a new workspace. You can invite teammates afterwards.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="create-org-dialog-form"
        >
          <div className="space-y-2">
            <Label htmlFor="new-org-name">Organization name</Label>
            <Input
              id="new-org-name"
              autoComplete="organization"
              placeholder="Acme Inc."
              aria-invalid={!!errors.name}
              data-testid="create-org-dialog-name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-destructive text-xs" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-org-slug">Workspace URL (optional)</Label>
            <Input
              id="new-org-slug"
              placeholder="acme"
              data-testid="create-org-dialog-slug"
              {...register('slug')}
            />
          </div>
          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="create-org-dialog-submit"
            >
              {isSubmitting ? 'Creating…' : 'Create organization'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
