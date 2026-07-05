import { Component, ReactNode } from 'react';
import { logError } from '@/lib/logger';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    logError('Uncaught render error', { message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-8">
          <div className="text-center space-y-4 max-w-md">
            <h1 className="text-2xl font-display font-bold text-foreground">
              Something went wrong
            </h1>
            <p className="text-muted-foreground text-sm">
              An unexpected error occurred. Try refreshing the page — your data is safe.
            </p>
            <Button onClick={() => window.location.reload()}>
              Refresh page
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
