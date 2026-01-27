import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, User, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function AdminSettings() {
    const { t } = useLanguage();
    const { profile } = useAuth();

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('الإعدادات', 'Settings')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('إعدادات الحساب والنظام', 'Account and system settings')}
                </p>
            </div>

            <div className="space-y-6 max-w-2xl">
                {/* Profile Section */}
                <div className="bg-background rounded-lg border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <User className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-medium text-foreground">{t('الملف الشخصي', 'Profile')}</h2>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>{t('الاسم الكامل', 'Full Name')}</Label>
                            <Input value={profile?.full_name || ''} disabled />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                            <Input value={profile?.email || ''} disabled />
                        </div>
                    </div>
                </div>

                {/* Role Section */}
                <div className="bg-background rounded-lg border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Shield className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-medium text-foreground">{t('الصلاحيات', 'Permissions')}</h2>
                    </div>

                    <div className="bg-primary/10 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="font-medium text-foreground">{t('مدير النظام', 'Super Admin')}</p>
                                <p className="text-sm text-muted-foreground mt-1">
                                    {t('لديك صلاحيات كاملة لإدارة الأكاديمية', 'You have full permissions to manage the academy')}
                                </p>
                            </div>
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                    </div>
                </div>

                {/* System Info */}
                <div className="bg-background rounded-lg border border-border p-6">
                    <div className="flex items-center gap-3 mb-4">
                        <Settings className="w-5 h-5 text-muted-foreground" />
                        <h2 className="font-medium text-foreground">{t('معلومات النظام', 'System Info')}</h2>
                    </div>

                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('الإصدار', 'Version')}</span>
                            <span className="text-foreground">1.0.0</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">{t('آخر تحديث', 'Last Updated')}</span>
                            <span className="text-foreground">2026</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
