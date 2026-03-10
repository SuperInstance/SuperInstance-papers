/**
 * React Error Boundary for POLLN Spreadsheets
 *
 * Catches JavaScript errors anywhere in the child component tree,
 * logs those errors, and displays a fallback UI.
 */

import React, { Component, ReactNode } from 'react';
import type { ErrorBoundaryProps, ErrorComponentProps } from './types.js';
import { globalErrorHandler } from './ErrorHandler.js';
import { globalErrorLogger } from './ErrorLogger.js';

/**
 * Default error display component
 */
function DefaultErrorComponent({ error, retry, details }: ErrorComponentProps): React.JSX.Element {
  return (
    <div
      style={{
        padding: '20px',
        margin: '20px',
        border: '1px solid #f56565',
        borderRadius: '8px',
        backgroundColor: '#fff5f5',
        color: '#c53030',
      }}
    >
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      {details && (
        <details style={{ marginTop: '10px' }}>
          <summary>Error details</summary>
          <pre
            style={{
              marginTop: '10px',
              padding: '10px',
              backgroundColor: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '4px',
              overflow: 'auto',
            }}
          >
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}
      <button
        onClick={retry}
        style={{
          marginTop: '15px',
          padding: '8px 16px',
          backgroundColor: '#c53030',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
        }}
      >
        Try Again
      </button>
    </div>
  );
}

/**
 * Error state for tracking errors
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

/**
 * Error Boundary component
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Convert to PollnError for consistent handling
    const pollnError = globalErrorHandler.handle(error, {
      sessionId: 'react-boundary',
    });

    // Log the error
    globalErrorLogger.logError(error, {
      location: errorInfo.componentStack,
      severity: 'high',
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleRetry = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { error } = this.state;

      if (!error) {
        return null;
      }

      // Use custom ErrorComponent if provided
      if (this.props.ErrorComponent) {
        const ErrorComp = this.props.ErrorComponent;
        return (
          <ErrorComp
            error={error}
            retry={this.handleRetry}
            details={
              this.state.errorInfo
                ? { componentStack: this.state.errorInfo.componentStack }
                : undefined
            }
          />
        );
      }

      // Use fallback function if provided
      if (typeof this.props.fallback === 'function') {
        return this.props.fallback(error, this.handleRetry);
      }

      // Use fallback element if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Use default error component
      return (
        <DefaultErrorComponent
          error={error}
          retry={this.handleRetry}
          details={
            this.state.errorInfo
              ? { componentStack: this.state.errorInfo.componentStack }
              : undefined
          }
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Hook component for functional components
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.ComponentType<P> {
  const WrappedComponent: React.ComponentType<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

/**
 * Hook for handling async errors in functional components
 */
export function useErrorHandler(): (error: Error) => void {
  return React.useCallback(
    (error: Error) => {
      throw error;
    },
    []
  );
}

/**
 * Hook for handling errors in async operations
 */
export function useAsyncErrorHandler(): [
  (fn: () => Promise<void>) => Promise<void>,
  { error: Error | null; loading: boolean }
] {
  const [error, setError] = React.useState<Error | null>(null);
  const [loading, setLoading] = React.useState(false);

  const execute = React.useCallback(
    async (fn: () => Promise<void>) => {
      setLoading(true);
      setError(null);

      try {
        await fn();
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        globalErrorLogger.logError(error, { severity: 'high' });
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return [execute, { error, loading }];
}

/**
 * Simple error display component for inline use
 */
export function ErrorDisplay({
  error,
  onDismiss,
}: {
  error: Error;
  onDismiss?: () => void;
}): React.JSX.Element {
  const message = globalErrorHandler.toUserMessage(
    error instanceof Error ? error : new Error(String(error))
  );
  const actions = globalErrorHandler.getSuggestedActions(
    error instanceof Error ? error : new Error(String(error))
  );

  return (
    <div
      style={{
        padding: '16px',
        margin: '16px',
        border: '1px solid #fc8181',
        borderRadius: '6px',
        backgroundColor: '#fff5f5',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#c53030' }}>Error</h3>
          <p style={{ margin: '0 0 12px 0' }}>{message}</p>
          {actions.length > 0 && (
            <ul style={{ margin: '0', paddingLeft: '20px' }}>
              {actions.map((action, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>
                  {action}
                </li>
              ))}
            </ul>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              marginLeft: '16px',
              padding: '4px 8px',
              background: 'none',
              border: '1px solid #c53030',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
