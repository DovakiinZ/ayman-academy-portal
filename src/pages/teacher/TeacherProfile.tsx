import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, User } from 'lucide-react';

export default function TeacherProfile() {
    const { t } = useLanguage();
    const { profile, refreshProfile } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);

        await supabase
            .from('profiles')
            .update({
                full_name: form.full_name,
                updated_at: new Date().toISOString(),
            })
            .eq('id', profile.id);

        await refreshProfile();
        setSaved(true);
        setSubmitting(false);
        setTimeout(() => setSaved(false), 3000);
    };

    return (
        <div className="max-w-xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('ملفي الشخصي', 'My Profile')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('تعديل معلومات حسابك', 'Edit your account information')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-background rounded-lg border border-border p-6 space-y-4">
                <div className="flex items-center gap-4 pb-4 border-b border-border">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <p className="font-medium text-foreground">{profile?.full_name || profile?.email}</p>
                        <p className="text-sm text-muted-foreground">{t('معلم', 'Teacher')}</p>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="full_name">{t('الاسم الكامل', 'Full Name')}</Label>
                    <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                    />
                </div>

                <div className="space-y-2">
                    <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                    <Input value={profile?.email || ''} disabled />
                    <p className="text-xs text-muted-foreground">
                        {t('لا يمكن تغيير البريد الإلكتروني', 'Email cannot be changed')}
                    </p>
                </div>

                <Button type="submit" disabled={submitting}>
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <>
                            <Save className="w-4 h-4 me-2" />
                            {saved ? t('تم الحفظ', 'Saved!') : t('حفظ التغييرات', 'Save Changes')}
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
