/**
 * Role-based route guard helpers.
 *
 * - AdminRoute   — super_admin only
 * - TeacherRoute — teacher OR super_admin
 * - StudentRoute — student only; redirects to /student/onboarding if stage not set
 *                  Pass allowOnboarding={true} to skip the onboarding redirect
 *                  (used for the /student/onboarding route itself).
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { roleBasePath } from '@/config/nav';
import type { UserRole } from '@/types/database';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface RouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
    redirectTo?: string;
    /** Skip the onboarding guard (used for the onboarding page itself) */
    allowOnboarding?: boolean;
}

function ProtectedRouteInner({
    children,
    allowedRoles,
    redirectTo = '/login',
    allowOnboarding = false,
}: RouteProps) {
    const { isAuthenticated, isLoading, profileLoading, isBootstrapped, role, profile, error, retryProfileFetch } = useAuth();
    const location = useLocation();

    // Wait for auth bootstrap
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

    // Profile load error
    if (error && !role) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 max-w-md w-full text-center">
                    <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-4" />
                    <h2 className="text-lg font-semibold text-foreground mb-2">فشل تحميل الصلاحيات</h2>
                    <p className="text-sm text-muted-foreground mb-4">{error}</p>
                    <Button onClick={retryProfileFetch} disabled={profileLoading} className="w-full">
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

    // Profile still loading
    if (profileLoading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-sm text-muted-foreground">جاري تحميل الصلاحيات...</p>
            </div>
        );
    }

    // Wrong role → redirect to correct dashboard
    if (allowedRoles && role && !allowedRoles.includes(role)) {
        const correctDashboard = roleBasePath[role] ?? '/';
        return <Navigate to={correctDashboard} replace />;
    }

    // ── Student onboarding guard ──────────────────────────────────────────────
    // If the student hasn't completed onboarding (student_stage is null),
    // redirect them to /student/onboarding.
    // We skip this check when rendering the onboarding page itself.
    if (!allowOnboarding && role === 'student' && profile && !(profile as any).student_stage) {
        return <Navigate to="/student/onboarding" replace />;
    }

    return <>{children}</>;
}

export function ProtectedRoute(props: RouteProps) {
    return <ProtectedRouteInner {...props} />;
}

interface SimpleRouteProps {
    children: React.ReactNode;
    allowOnboarding?: boolean;
}

export function AdminRoute({ children }: SimpleRouteProps) {
    return (
        <ProtectedRouteInner allowedRoles={['super_admin']}>
            {children}
        </ProtectedRouteInner>
    );
}

export function TeacherRoute({ children }: SimpleRouteProps) {
    return (
        <ProtectedRouteInner allowedRoles={['teacher', 'super_admin']}>
            {children}
        </ProtectedRouteInner>
    );
}

export function StudentRoute({ children, allowOnboarding }: SimpleRouteProps) {
    return (
        <ProtectedRouteInner allowedRoles={['student']} allowOnboarding={allowOnboarding}>
            {children}
        </ProtectedRouteInner>
    );
}
