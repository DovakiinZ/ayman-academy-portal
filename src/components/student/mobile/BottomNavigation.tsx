import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LayoutDashboard, BookOpen, Award, User } from 'lucide-react';

const tabs = [
    { path: '/student', icon: LayoutDashboard, label: { ar: 'الرئيسية', en: 'Home' }, exact: true },
    { path: '/student/subjects', icon: BookOpen, label: { ar: 'موادي', en: 'Subjects' } },
    { path: '/student/certificates', icon: Award, label: { ar: 'شهاداتي', en: 'Certificates' } },
    { path: '/student/profile', icon: User, label: { ar: 'الملف الشخصي', en: 'Profile' } },
];

export default function BottomNavigation() {
    const { t } = useLanguage();
    const location = useLocation();

    const isActive = (path: string, exact?: boolean) => {
        if (exact) return location.pathname === path;
        return location.pathname.startsWith(path);
    };

    return (
        <nav
            className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/60"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
            <div className="flex items-stretch" style={{ height: 64 }}>
                {tabs.map((tab) => {
                    const active = isActive(tab.path, tab.exact);
                    return (
                        <Link
                            key={tab.path}
                            to={tab.path}
                            className={`flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-150 active:scale-95 ${active ? 'text-primary' : 'text-muted-foreground'
                                }`}
                        >
                            <div
                                className={`flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200 ${active ? 'bg-primary/10 scale-105' : ''
                                    }`}
                            >
                                <tab.icon
                                    className={`transition-all duration-200 ${active ? 'w-[22px] h-[22px]' : 'w-5 h-5'
                                        }`}
                                    strokeWidth={active ? 2.5 : 1.8}
                                />
                            </div>
                            <span
                                className={`text-[10px] leading-none transition-all duration-200 ${active ? 'font-bold' : 'font-medium'
                                    }`}
                            >
                                {t(tab.label.ar, tab.label.en)}
                            </span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
