import { useOnboardingStore } from '@/shared/store/useOnboardingStore/index.ts';

/** Review summary shown before the final "Enter dashboard" action. */
export function DoneStep() {
  const { data } = useOnboardingStore();
  return (
    <dl className="space-y-3 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Name</dt>
        <dd className="font-medium">{data.fullName || '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Organization</dt>
        <dd className="font-medium">{data.organizationName || '—'}</dd>
      </div>
      <div className="flex justify-between">
        <dt className="text-muted-foreground">Invites</dt>
        <dd className="font-medium">{data.invites.length} pending</dd>
      </div>
    </dl>
  );
}
