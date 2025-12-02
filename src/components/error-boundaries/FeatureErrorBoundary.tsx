import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, X } from 'lucide-react';

interface Props {
  children: ReactNode;
  featureName: string;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  dismissed: boolean;
}

/**
 * Feature-level error boundary catching errors in complex features
 * Shows inline error within feature container with retry/dismiss options
 */
export class FeatureErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      dismissed: false 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`FeatureErrorBoundary (${this.props.featureName}) caught error:`, error, errorInfo);
    
    // TODO: Send to error tracking
    // logErrorToSentry({
    //   error,
    //   errorInfo,
    //   level: 'warning',
    //   context: {
    //     boundary: 'Feature',
    //     featureName: this.props.featureName,
    //     componentStack: errorInfo.componentStack
    //   }
    // });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, dismissed: false });
  };

  handleDismiss = () => {
    this.setState({ dismissed: true });
  };

  render() {
    if (this.state.hasError && !this.state.dismissed) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="border border-destructive/50 rounded-lg p-6 bg-destructive/5">
          <div className="flex items-start gap-4">
            <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
            
            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground">
                  {this.props.featureName} Error
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This feature encountered an error. You can retry or dismiss this message to continue using other features.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={this.handleRetry}
                  size="sm"
                  variant="outline"
                >
                  Retry
                </Button>
                
                <Button 
                  onClick={this.handleDismiss}
                  size="sm"
                  variant="ghost"
                >
                  <X className="w-4 h-4 mr-1" />
                  Dismiss
                </Button>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-medium">
                    Error Details
                  </summary>
                  <pre className="mt-2 p-2 bg-background rounded overflow-auto">
                    {this.state.error.toString()}
                  </pre>
                </details>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (this.state.dismissed) {
      return null;
    }

    return this.props.children;
  }
}
