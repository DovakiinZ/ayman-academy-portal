import { Link, useLocation, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookMarked,
    FileText,
    ClipboardList,
    BookOpen,
    Settings,
    LogOut,
    Menu,
    X,
    Type
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import logo from '@/assets/logo.png';

const navItems = [
    { path: '/admin', icon: LayoutDashboard, label: { ar: 'لوحة التحكم', en: 'Dashboard' }, exact: true },
    { path: '/admin/homepage', icon: LayoutDashboard, label: { ar: 'الصفحة الرئيسية', en: 'Homepage' } },
    { path: '/admin/templates', icon: Type, label: { ar: 'القوالب والنصوص', en: 'Templates' } },
    { path: '/admin/teachers', icon: Users, label: { ar: 'المعلمون', en: 'Teachers' } },
    { path: '/admin/stages', icon: GraduationCap, label: { ar: 'المراحل', en: 'Stages' } },
    { path: '/admin/subjects', icon: BookMarked, label: { ar: 'المواد', en: 'Subjects' } },
    { path: '/admin/lessons', icon: FileText, label: { ar: 'الدروس', en: 'Lessons' } },
    { path: '/admin/settings', icon: Settings, label: { ar: 'الإعدادات', en: 'Settings' } },
];

export default function AdminLayout() {
    const { t } = useLanguage();
    const { profile, signOut } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    const handleSignOut = async () => {
        await signOut();
        navigate('/login');
    };

    return (
        <div className="min-h-screen bg-secondary/30">
            {/* Mobile header */}
            <header className="lg:hidden sticky top-0 z-50 bg-background border-b border-border px-4 h-14 flex items-center justify-between">
                <Link to="/admin">
                    <img src={logo} alt="Ayman Academy" className="h-14" />
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                    {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </Button>
            </header>

            <div className="flex">
                {/* Sidebar */}
                <aside className={`
          fixed lg:sticky top-0 lg:top-0 z-40 h-screen w-64 bg-background border-e border-border
          transform transition-transform lg:transform-none
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}>
                    <div className="flex flex-col h-full">
                        {/* Logo */}
                        <div className="hidden lg:flex items-center h-14 px-4 border-b border-border">
                            <Link to="/admin">
                                <img src={logo} alt="Ayman Academy" className="h-14" />
                            </Link>
                        </div>

                        {/* Navigation */}
                        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
                            {navItems.map((item) => (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                    flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors
                    ${isActive(item.path, item.exact)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
                                        }
                  `}
                                >
                                    <item.icon className="w-4 h-4" />
                                    {t(item.label.ar, item.label.en)}
                                </Link>
                            ))}
                        </nav>

                        {/* User section */}
                        <div className="p-3 border-t border-border">
                            <div className="px-3 py-2 mb-2">
                                <p className="text-sm font-medium text-foreground truncate">{profile?.full_name || profile?.email}</p>
                                <p className="text-xs text-muted-foreground">{t('مدير النظام', 'Super Admin')}</p>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
                                onClick={handleSignOut}
                            >
                                <LogOut className="w-4 h-4" />
                                {t('تسجيل الخروج', 'Sign Out')}
                            </Button>
                        </div>
                    </div>
                </aside>

                {/* Overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-30 lg:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <main className="flex-1 min-h-screen lg:min-h-[calc(100vh)]">
                    <div className="p-4 lg:p-6">
                        <ErrorBoundary>
                            <Outlet />
                        </ErrorBoundary>
                    </div>
                </main>
            </div>
        </div>
    );
}
