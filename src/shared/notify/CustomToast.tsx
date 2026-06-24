import { toast } from 'sonner';

import { cn } from '@/lib/utils.ts';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  type LucideIcon,
  X,
  XCircle,
} from '@/shared/icons/index.ts';
import { useThemeStore } from '@/shared/store/useThemeStore/index.ts';
import { TOAST_VARIANTS } from '@/shared/theme/index.ts';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastTone {
  icon: LucideIcon;
  iconColor: string;
  solid: string;
  outlineBorder: string;
  bar: string;
}

/**
 * Per-type token sets (semantic tokens only — themeable, light/dark correct).
 * Backgrounds stay OPAQUE so the toast reads clearly over any surface, including
 * a modal's dim overlay.
 */
const TONES: Record<ToastType, ToastTone> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-success',
    solid: 'bg-success text-success-foreground',
    outlineBorder: 'border-success/50',
    bar: 'bg-success',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-destructive',
    solid: 'bg-destructive text-destructive-foreground',
    outlineBorder: 'border-destructive/50',
    bar: 'bg-destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-warning',
    solid: 'bg-warning text-warning-foreground',
    outlineBorder: 'border-warning/50',
    bar: 'bg-warning',
  },
  info: {
    icon: AlertCircle,
    iconColor: 'text-info',
    solid: 'bg-info text-info-foreground',
    outlineBorder: 'border-info/50',
    bar: 'bg-info',
  },
};

export interface CustomToastProps {
  id: string | number;
  type: ToastType;
  title: string;
  description?: string;
}

/**
 * The app's custom toast surface (TEMP: multiple designs). The active design is
 * the `toastVariant` index in the theme store — **soft** (muted surface, tone
 * icon), **solid** (filled), **outline** (tone border), or **accent** (left tone
 * bar). Shuffle rolls it; the Appearance panel previews it. Rendered via
 * `toast.custom` from `notify`, so this is the single place the toast look lives.
 */
export function CustomToast({ id, type, title, description }: CustomToastProps) {
  const index = useThemeStore((s) => s.toastVariant);
  const variant = TOAST_VARIANTS[index % TOAST_VARIANTS.length] ?? 'soft';
  const tone = TONES[type];
  const Icon = tone.icon;
  const solid = variant === 'solid';

  return (
    <div
      data-testid="app-toast"
      data-toast-variant={variant}
      className={cn(
        'pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-xl border p-4 shadow-lg',
        variant === 'soft' && 'bg-muted text-foreground border-transparent',
        solid && cn(tone.solid, 'border-transparent'),
        variant === 'outline' &&
          cn('bg-popover text-popover-foreground', tone.outlineBorder),
        variant === 'accent' && 'bg-popover text-popover-foreground border-border pl-5',
      )}
    >
      {variant === 'accent' ? (
        <span
          className={cn('absolute inset-y-0 left-0 w-1.5', tone.bar)}
          aria-hidden="true"
        />
      ) : null}
      <Icon
        className={cn('mt-0.5 size-5 shrink-0', !solid && tone.iconColor)}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        {description ? (
          <p
            className={cn(
              'mt-0.5 text-xs',
              solid ? 'opacity-90' : 'text-muted-foreground',
            )}
          >
            {description}
          </p>
        ) : null}
      </div>
      <button
        type="button"
        onClick={() => toast.dismiss(id)}
        aria-label="Dismiss notification"
        className={cn(
          'shrink-0 rounded-md p-1 opacity-70 transition hover:opacity-100',
          solid ? 'hover:bg-background/25' : 'hover:bg-foreground/10',
        )}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
