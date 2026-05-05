/**
 * ErrorBoundary — Catches React render errors and shows a fallback UI
 *
 * SOLID: Single Responsibility — error catching only
 * Prevents entire app crash when a child component throws.
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error(
      `[ErrorBoundary] Error in ${this.props.componentName ?? 'component'}:`,
      error,
      info.componentStack
    );
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center p-8 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-center gap-4">
          <AlertTriangle size={32} className="text-red-500" />
          <div>
            <p className="font-semibold text-red-700 dark:text-red-300">
              {this.props.componentName
                ? `${this.props.componentName} encountered an error`
                : 'Something went wrong'}
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-1 font-mono max-w-xs truncate">
              {this.state.error?.message}
            </p>
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <RefreshCw size={14} />
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
