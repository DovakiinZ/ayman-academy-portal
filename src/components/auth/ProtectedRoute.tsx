import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { roleBasePath } from '@/config/nav';
import type { UserRole } from '@/types/database';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    redirectTo?: string;
}

export function ProtectedRoute({
    children,
    allowedRoles,
    redirectTo = '/login'
}: ProtectedRouteProps) {
    const { isAuthenticated, isLoading, profileLoading, isBootstrapped, role, error, retryProfileFetch } = useAuth();
    const location = useLocation();

    // Wait for both session resolution AND profile fetch to complete.
    // This prevents a flash of wrong layout (or wrong redirect) before role is known.
    if (isLoading || !isBootstrapped) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    // Not authenticated
    if (!isAuthenticated) {
        return <Navigate to={redirectTo} state={{ from: location }} replace />;
    }

    // Profile loading with error (show retry)
    if (error && !role) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md w-full text-center">
                    <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">
                        فشل تحميل الصلاحيات
                    </h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        {error}
                    </p>
                    <Button
                        onClick={retryProfileFetch}
                        disabled={profileLoading}
                        className="w-full"
                    >
                        {profileLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin me-2" />
                        ) : (
                            <RefreshCw className="w-4 h-4 me-2" />
                        )}
                        إعادة المحاولة
                    </Button>
                </div>
            </div>
        );
    }

    // Still loading profile (bootstrapped but profile is mid-fetch — e.g. on retry)
    if (profileLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">جاري تحميل الصلاحيات...</p>
            </div>
        );
    }

    // Role-based access control:
    // If the user's role is not in allowedRoles, redirect them to THEIR correct dashboard
    // instead of a generic /access-denied page. This fixes the teacher→/student bug.
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        const correctDashboard = roleBasePath[role] ?? '/';
        return <Navigate to={correctDashboard} replace />;
    }

    return <>{children}</>;
}
