import { z } from 'zod';

/**
 * Editable profile fields. The source of truth for the "About you" form; the TS
 * type is inferred so the form, API payload, and completeness meter stay aligned.
 *
 * Wire mapping (in `authApi.updateProfile`): `name` → core-be `first_name` +
 * `last_name`, `jobTitle` → `job_title` (snake_case, `PATCH /users/me`). `bio`,
 * `location`, and `timezone` have no core-be column yet — they stay FE-only until
 * the backend adds them, at which point align the snake_case wire names here.
 */
export const profileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(80, 'Name is too long'),
  jobTitle: z.string().max(80, 'Job title is too long').optional().or(z.literal('')),
  bio: z
    .string()
    .max(280, 'Bio must be 280 characters or fewer')
    .optional()
    .or(z.literal('')),
  location: z.string().max(80, 'Location is too long').optional().or(z.literal('')),
  timezone: z.string().max(64).optional().or(z.literal('')),
});

export type ProfileInput = z.infer<typeof profileSchema>;

/** Common IANA timezones offered in the profile form. */
export const TIMEZONES = [
  'UTC',
  'America/Los_Angeles',
  'America/New_York',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Australia/Sydney',
] as const;

/**
 * Percentage (0–100) of the profile that has been filled in. Used by the
 * completeness meter in the profile header to nudge users to complete setup.
 */
export function computeProfileCompleteness(profile: Partial<ProfileInput>): number {
  const fields: (keyof ProfileInput)[] = [
    'name',
    'jobTitle',
    'bio',
    'location',
    'timezone',
  ];
  const filled = fields.filter((f) =>
    // eslint-disable-next-line security/detect-object-injection -- `f` is a constrained keyof union
    Boolean(profile[f]?.toString().trim()),
  ).length;
  return Math.round((filled / fields.length) * 100);
}
