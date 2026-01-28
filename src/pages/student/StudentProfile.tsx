import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, User, Check } from 'lucide-react';

export default function StudentProfile() {
    const { t } = useLanguage();
    const { profile, refreshProfile } = useAuth();

    const [fullName, setFullName] = useState(profile?.full_name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!profile?.id) return;

        setIsSaving(true);
        setSaved(false);

        await supabase
            .from('profiles')
            .update({ full_name: fullName })
            .eq('id', profile.id);

        await refreshProfile();
        setIsSaving(false);
        setSaved(true);

        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="max-w-xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('ملفي الشخصي', 'My Profile')}
                </h1>
                <p className="text-muted-foreground mt-1">
                    {t('إدارة معلوماتك الشخصية', 'Manage your personal information')}
                </p>
            </div>

            <div className="bg-background rounded-lg border border-border p-6 space-y-6">
                {/* Avatar */}
                <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center">
                        {profile?.avatar_url ? (
                            <img
                                src={profile.avatar_url}
                                alt={profile.full_name || ''}
                                className="w-full h-full rounded-full object-cover"
                            />
                        ) : (
                            <User className="w-8 h-8 text-muted-foreground" />
                        )}
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{profile?.full_name || t('طالب', 'Student')}</p>
                        <p className="text-sm text-muted-foreground">{profile?.email}</p>
                    </div>
                </div>

                {/* Form */}
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">{t('الاسم الكامل', 'Full Name')}</Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t('أدخل اسمك الكامل', 'Enter your full name')}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                        <Input
                            value={profile?.email || ''}
                            disabled
                            className="bg-secondary/50"
                        />
                        <p className="text-xs text-muted-foreground">
                            {t('البريد الإلكتروني غير قابل للتغيير', 'Email cannot be changed')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label>{t('نوع الحساب', 'Account Type')}</Label>
                        <Input
                            value={t('طالب', 'Student')}
                            disabled
                            className="bg-secondary/50"
                        />
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full sm:w-auto"
                    >
                        {isSaving ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : saved ? (
                            <>
                                <Check className="w-4 h-4 me-2" />
                                {t('تم الحفظ', 'Saved')}
                            </>
                        ) : (
                            t('حفظ التغييرات', 'Save Changes')
                        )}
                    </Button>
                </div>
            </div>

            {/* Account Info */}
            <div className="bg-background rounded-lg border border-border p-6">
                <h2 className="font-medium text-foreground mb-4">
                    {t('معلومات الحساب', 'Account Information')}
                </h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('تاريخ الانضمام', 'Joined')}</span>
                        <span className="text-foreground">
                            {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '-'}
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">{t('اللغة المفضلة', 'Preferred Language')}</span>
                        <span className="text-foreground">
                            {profile?.language_pref === 'ar' ? 'العربية' : 'English'}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
