import React, { Component, ReactNode } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

// ============================================
// ERROR FALLBACK COMPONENT
// ============================================

interface ErrorFallbackProps {
    error: Error;
    resetError: () => void;
}

function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
    // We can't use hooks directly in class component children
    // So we use a functional component for the UI
    const handleReload = () => {
        window.location.reload();
    };

    const handleGoHome = () => {
        window.location.href = '/admin';
    };

    const isDev = import.meta.env.DEV;

    return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
            <div className="max-w-md w-full text-center">
                <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
                    <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>

                <h2 className="text-xl font-semibold text-foreground mb-2">
                    حدث خطأ غير متوقع
                </h2>
                <p className="text-sm text-muted-foreground mb-2">
                    An unexpected error occurred
                </p>

                {isDev && (
                    <div className="mt-4 p-3 bg-muted rounded-lg text-start overflow-auto max-h-32">
                        <p className="text-xs font-mono text-destructive break-all">
                            {error.message}
                        </p>
                    </div>
                )}

                <div className="flex gap-3 mt-6">
                    <Button
                        variant="outline"
                        className="flex-1"
                        onClick={handleGoHome}
                    >
                        <Home className="w-4 h-4 me-2" />
                        لوحة التحكم
                    </Button>
                    <Button
                        className="flex-1"
                        onClick={handleReload}
                    >
                        <RefreshCw className="w-4 h-4 me-2" />
                        إعادة تحميل
                    </Button>
                </div>
            </div>
        </div>
    );
}

// ============================================
// ERROR BOUNDARY CLASS COMPONENT
// ============================================

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        // Update state so the next render will show the fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        // Log error to console in dev mode
        if (import.meta.env.DEV) {
            console.error('[ErrorBoundary] Caught error:', error);
            console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
        }
    }

    resetError = (): void => {
        this.setState({ hasError: false, error: null });
    };

    render(): ReactNode {
        if (this.state.hasError && this.state.error) {
            // Render custom fallback or default ErrorFallback
            if (this.props.fallback) {
                return this.props.fallback;
            }
            return (
                <ErrorFallback
                    error={this.state.error}
                    resetError={this.resetError}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
