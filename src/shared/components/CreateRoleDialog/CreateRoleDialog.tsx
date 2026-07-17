import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';

import { translateFormMessage } from '@/lib/i18n/translate-form-message.ts';
import {
  ASSIGNABLE_ROLE_PERMISSIONS,
  type RoleInput,
  roleInputSchema,
} from '@/shared/api/organization-contracts.ts';
import { Button } from '@/shared/components/ui/button.tsx';
import { Checkbox } from '@/shared/components/ui/checkbox.tsx';
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
import { Textarea } from '@/shared/components/ui/textarea.tsx';
import { useCreateRole } from '@/shared/hooks/useRoles/index.ts';
import { Plus } from '@/shared/icons/index.ts';

const EMPTY_ROLE: RoleInput = { name: '', description: '', permissions: [] };

/** Add or remove a permission code from the selected set. */
function togglePermission(current: string[], perm: string, checked: boolean): string[] {
  return checked ? [...current, perm] : current.filter((p) => p !== perm);
}

/**
 * Dialog + form for creating a custom role (name, description, and a checklist
 * of assignable permissions). A freshly-created org has only the system Owner
 * role, so this is the entry point for the Admin/Member/Viewer roles that make
 * inviting members possible. Gated by the caller (render only when the user
 * holds `role:manage`).
 */
export function CreateRoleDialog() {
  const [open, setOpen] = useState(false);
  const createRole = useCreateRole();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoleInput>({
    resolver: zodResolver(roleInputSchema),
    defaultValues: EMPTY_ROLE,
  });

  const onSubmit = async (data: RoleInput) => {
    await createRole.mutateAsync(data);
    reset(EMPTY_ROLE);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" data-testid="role-create-open">
          <Plus className="mr-2 h-4 w-4" />
          New role
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create a role</DialogTitle>
          <DialogDescription>
            Define a permission set you can assign to members.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
          data-testid="role-create-form"
        >
          <div className="space-y-2">
            <Label htmlFor="role-name">Name</Label>
            <Input
              id="role-name"
              placeholder="e.g. Member"
              aria-invalid={!!errors.name}
              data-testid="role-create-name"
              {...register('name')}
            />
            {errors.name && (
              <p className="text-destructive text-xs" role="alert">
                {translateFormMessage(errors.name.message)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="role-description">Description</Label>
            <Textarea
              id="role-description"
              placeholder="What can this role do?"
              aria-invalid={!!errors.description}
              data-testid="role-create-description"
              {...register('description')}
            />
            {errors.description && (
              <p className="text-destructive text-xs" role="alert">
                {translateFormMessage(errors.description.message)}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Permissions</Label>
            <Controller
              control={control}
              name="permissions"
              render={({ field }) => (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {ASSIGNABLE_ROLE_PERMISSIONS.map((perm) => (
                    <div key={perm} className="flex items-center gap-2">
                      <Checkbox
                        id={`role-perm-${perm}`}
                        checked={field.value.includes(perm)}
                        onCheckedChange={(value) =>
                          field.onChange(
                            togglePermission(field.value, perm, value === true),
                          )
                        }
                        data-testid={`role-perm-${perm}`}
                      />
                      <Label
                        htmlFor={`role-perm-${perm}`}
                        className="text-muted-foreground font-mono text-xs font-normal"
                      >
                        {perm}
                      </Label>
                    </div>
                  ))}
                </div>
              )}
            />
            {errors.permissions && (
              <p className="text-destructive text-xs" role="alert">
                {translateFormMessage(errors.permissions.message)}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              type="submit"
              disabled={isSubmitting}
              data-testid="role-create-submit"
            >
              {isSubmitting ? 'Creating…' : 'Create role'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
