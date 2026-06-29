import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { type Control, Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';

import { ERRORS_KEYS, ERRORS_NS } from '@/lib/i18n/errors.constants.ts';
import i18n from '@/lib/i18n/i18n.ts';
import {
  SETTINGS_KEYS,
  SETTINGS_NS,
} from '@/shared/components/SettingsModal/settings.constants.ts';
import { useRegisterSettingsDirty } from '@/shared/components/SettingsModal/settings-dirty.tsx';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/components/ui/alert-dialog.tsx';
import { Button } from '@/shared/components/ui/button.tsx';
import { Input } from '@/shared/components/ui/input.tsx';
import { Label } from '@/shared/components/ui/label.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select.tsx';
import { Textarea } from '@/shared/components/ui/textarea.tsx';
import { notify } from '@/shared/notify/index.ts';

import { type ProfileInput, profileSchema, TIMEZONES } from './contracts.ts';

const BIO_MAX = 280;

/** Timezone picker wired to react-hook-form via a controlled Select. */
function TimezoneField({ control }: { control: Control<ProfileInput> }) {
  return (
    <Controller
      control={control}
      name="timezone"
      render={({ field }) => (
        <Select
          value={field.value === '' ? undefined : field.value}
          onValueChange={field.onChange}
        >
          <SelectTrigger
            id="profile-timezone"
            className="w-full"
            data-testid="profile-timezone"
          >
            <SelectValue placeholder="Select a timezone" />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>
                {tz}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    />
  );
}

interface ProfileFormProps {
  email: string;
  defaultValues?: Partial<ProfileInput>;
  /** Called whenever any field changes — used to drive the completeness meter. */
  onValuesChange?: (values: ProfileInput) => void;
}

function toDefaults(values?: Partial<ProfileInput>): ProfileInput {
  return {
    name: values?.name ?? '',
    jobTitle: values?.jobTitle ?? '',
    bio: values?.bio ?? '',
    location: values?.location ?? '',
    timezone: values?.timezone ?? '',
  };
}

/**
 * "About you" profile form: name, job title, bio, location, and timezone.
 * Validates with {@link profileSchema}; saving is confirmed via a dialog.
 *
 * NOT YET PERSISTED — deferred to the FE↔BE integration epic. core-be
 * `PATCH /users/me` currently accepts only `name` (+ avatar); `jobTitle`, `bio`,
 * `location`, and `timezone` have no backend column. Wiring requires (a) those
 * fields added to the user model + PATCH payload, then (b) a `useUpdateProfile`
 * mutation here. Until then the confirm dialog resets the form locally only.
 */
export function ProfileForm({ email, defaultValues, onValuesChange }: ProfileFormProps) {
  const { t } = useTranslation(SETTINGS_NS);
  const panels = SETTINGS_KEYS.panels.profile;
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: toDefaults(defaultValues),
  });

  useRegisterSettingsDirty('profile', isDirty && !showConfirm);

  useEffect(() => {
    if (!onValuesChange) return undefined;
    // eslint-disable-next-line react-hooks/incompatible-library -- watch() subscription is intentional and cleaned up below
    const subscription = watch((values) => onValuesChange(values as ProfileInput));
    return () => subscription.unsubscribe();
  }, [watch, onValuesChange]);

  const bioValue = watch('bio') ?? '';

  const onConfirmedSubmit = handleSubmit((values) => {
    setShowConfirm(false);
    reset(values);
    notify.success(i18n.t(ERRORS_KEYS.frontend.profileUpdated, { ns: ERRORS_NS }));
  });

  return (
    <>
      <form
        className="space-y-5"
        data-testid="profile-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (isDirty) setShowConfirm(true);
        }}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-name">Name</Label>
            <Input
              id="profile-name"
              {...register('name')}
              placeholder="Your name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'profile-name-error' : undefined}
              data-testid="profile-name"
            />
            {errors.name && (
              <p
                id="profile-name-error"
                className="text-destructive text-xs"
                role="alert"
              >
                {errors.name.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-job-title">Job title</Label>
            <Input
              id="profile-job-title"
              {...register('jobTitle')}
              placeholder="e.g. Product Engineer"
              data-testid="profile-job-title"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="profile-email">Email</Label>
          <Input
            id="profile-email"
            type="email"
            value={email}
            disabled
            readOnly
            aria-describedby="profile-email-desc"
            className="text-muted-foreground"
            data-testid="profile-email"
          />
          <p id="profile-email-desc" className="text-muted-foreground text-xs">
            Email cannot be changed here.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="profile-bio">Bio</Label>
            <span className="text-muted-foreground text-xs tabular-nums">
              {bioValue.length}/{BIO_MAX}
            </span>
          </div>
          <Textarea
            id="profile-bio"
            {...register('bio')}
            maxLength={BIO_MAX}
            placeholder="A short bio about you."
            aria-invalid={!!errors.bio}
            data-testid="profile-bio"
          />
          {errors.bio && (
            <p className="text-destructive text-xs" role="alert">
              {errors.bio.message}
            </p>
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="profile-location">Location</Label>
            <Input
              id="profile-location"
              {...register('location')}
              placeholder="e.g. San Francisco, CA"
              data-testid="profile-location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="profile-timezone">Timezone</Label>
            <TimezoneField control={control} />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !isDirty}
          data-testid="profile-submit"
        >
          {isSubmitting ? t(panels.saving) : t(panels.save)}
        </Button>
      </form>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(panels.confirmTitle)}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(panels.confirmDescription)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="profile-confirm-cancel">
              {t(panels.confirmCancel)}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void onConfirmedSubmit()}
              data-testid="profile-confirm-save"
            >
              {t(panels.confirmSave)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
