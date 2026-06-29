import { useLocaleFormat } from '@/shared/hooks/useLocaleFormat/index.ts';

type FormattedDateProps = {
  value: string | Date;
  /** When true, show relative time for recent dates (falls back to date for older). */
  relative?: boolean;
  className?: string;
};

/** Renders a date using the user's locale + date-format preferences. */
export function FormattedDate({
  value,
  relative = false,
  className,
}: FormattedDateProps) {
  const { formatDate, formatRelativeTime } = useLocaleFormat();
  const text = relative ? formatRelativeTime(value) : formatDate(value);
  return (
    <time
      dateTime={typeof value === 'string' ? value : value.toISOString()}
      className={className}
    >
      {text}
    </time>
  );
}
