import { Component, type ErrorInfo, type ReactNode } from 'react';

import { Button } from '@/shared/components/ui/button.tsx';
import { AlertTriangle } from '@/shared/icons/index.ts';

interface WidgetErrorBoundaryProps {
  children: ReactNode;
  /** Short label shown in the fallback (e.g. "Analytics"). */
  title: string;
  /** Optional test id for the fallback container. */
  testId?: string;
}

interface WidgetErrorBoundaryState {
  hasError: boolean;
}

/**
 * Section-level error boundary so one failing widget does not blank the whole page.
 */
export class WidgetErrorBoundary extends Component<
  WidgetErrorBoundaryProps,
  WidgetErrorBoundaryState
> {
  state: WidgetErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): WidgetErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    if (import.meta.env.DEV) {
      console.error(`[WidgetErrorBoundary:${this.props.title}]`, error, info);
    }
  }

  private readonly handleRetry = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="border-border flex min-h-[160px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-6 text-center"
          data-testid={this.props.testId ?? 'widget-error'}
          role="alert"
        >
          <AlertTriangle className="text-muted-foreground h-8 w-8" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">{this.props.title} unavailable</p>
            <p className="text-muted-foreground mt-1 text-xs">
              Something went wrong loading this section. Try again.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={this.handleRetry}>
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
