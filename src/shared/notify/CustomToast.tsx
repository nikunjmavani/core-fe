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
  soft: string;
  solid: string;
  outline: string;
  bar: string;
}

/** Per-type token sets (semantic tokens only — themeable, light/dark correct). */
const TONES: Record<ToastType, ToastTone> = {
  success: {
    icon: CheckCircle2,
    iconColor: 'text-success',
    soft: 'bg-success/10 border-success/25',
    solid: 'bg-success border-transparent text-success-foreground',
    outline: 'bg-card border-success/40',
    bar: 'bg-success',
  },
  error: {
    icon: XCircle,
    iconColor: 'text-destructive',
    soft: 'bg-destructive/10 border-destructive/25',
    solid: 'bg-destructive border-transparent text-destructive-foreground',
    outline: 'bg-card border-destructive/40',
    bar: 'bg-destructive',
  },
  warning: {
    icon: AlertTriangle,
    iconColor: 'text-warning',
    soft: 'bg-warning/10 border-warning/25',
    solid: 'bg-warning border-transparent text-warning-foreground',
    outline: 'bg-card border-warning/40',
    bar: 'bg-warning',
  },
  info: {
    icon: AlertCircle,
    iconColor: 'text-info',
    soft: 'bg-info/10 border-info/25',
    solid: 'bg-info border-transparent text-info-foreground',
    outline: 'bg-card border-info/40',
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
 * the `toastVariant` index in the theme store — **soft** (tinted), **solid**
 * (filled), **outline** (bordered), or **accent** (left colour bar). Shuffle rolls
 * it; the Appearance panel previews it. Rendered via `toast.custom` from `notify`,
 * so this is the single place the toast look is defined.
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
        variant === 'soft' && cn(tone.soft, 'text-foreground'),
        solid && tone.solid,
        variant === 'outline' && cn(tone.outline, 'text-foreground'),
        variant === 'accent' && 'bg-card text-foreground border-border pl-5',
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
          'shrink-0 rounded-md p-0.5 opacity-70 transition hover:opacity-100',
          !solid && 'text-muted-foreground hover:text-foreground',
        )}
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
