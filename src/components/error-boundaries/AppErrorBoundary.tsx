import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Top-level error boundary catching catastrophic application errors
 * Shows full-page error screen with recovery options
 */
export class AppErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('AppErrorBoundary caught error:', error, errorInfo);
    
    this.setState({ errorInfo });

    // TODO: Send to Sentry or error tracking service
    // logErrorToSentry({
    //   error,
    //   errorInfo,
    //   level: 'fatal',
    //   context: {
    //     boundary: 'App',
    //     componentStack: errorInfo.componentStack
    //   }
    // });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleReport = () => {
    // TODO: Open support dialog or send error report
    const errorDetails = {
      message: this.state.error?.message,
      stack: this.state.error?.stack,
      componentStack: this.state.errorInfo?.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent
    };
    
    console.log('Error report:', errorDetails);
    alert('Error report sent. Our team will investigate this issue.');
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center space-y-6">
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-destructive/10">
              <AlertTriangle className="w-12 h-12 text-destructive" />
            </div>
            
            <div className="space-y-3">
              <h1 className="text-3xl font-bold text-foreground font-heading">
                Something went wrong
              </h1>
              <p className="text-muted-foreground text-lg">
                We've been notified and are working on a fix.
              </p>
              <p className="text-sm text-muted-foreground">
                Try reloading the page or return home to continue learning.
              </p>
            </div>

            <div className="space-y-3">
              <Button
                onClick={this.handleReload}
                className="w-full"
                size="lg"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reload Page
              </Button>
              
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Home className="w-4 h-4 mr-2" />
                Go to Dashboard
              </Button>

              <Button
                onClick={this.handleReport}
                variant="ghost"
                className="w-full text-sm"
              >
                Report this issue
              </Button>
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-6 p-4 bg-muted rounded-lg text-left">
                <summary className="cursor-pointer text-sm font-medium text-foreground mb-2">
                  Error Details (Development Only)
                </summary>
                <div className="space-y-2">
                  <pre className="text-xs text-destructive overflow-auto p-2 bg-background rounded">
                    {this.state.error.toString()}
                  </pre>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="text-xs text-muted-foreground overflow-auto p-2 bg-background rounded max-h-40">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
