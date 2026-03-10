import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { TranslationButton } from '@/components/admin/TranslationButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, User, Camera, Award, BookOpen, Upload } from 'lucide-react';
import type { Profile } from '@/types/database';

export default function TeacherProfile() {
    const { t } = useLanguage();
    const { profile, refreshProfile, error: authError } = useAuth();

    const [form, setForm] = useState({
        full_name: '',
        bio_ar: '',
        bio_en: '',
        avatar_url: '',
        qualifications: '',
    });

    const { isTranslating: bioTranslating } = useAutoTranslate(
        form.bio_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, bio_en: text }))
    );
    const [submitting, setSubmitting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (profile) {
            const p = profile as any;
            setForm({
                full_name: p.full_name || '',
                bio_ar: p.bio_ar || '',
                bio_en: p.bio_en || '',
                avatar_url: p.avatar_url || '',
                qualifications: p.qualifications || '',
            });
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;

        if (!form.full_name.trim()) {
            toast.error(t('الاسم مطلوب', 'Full name is required'));
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await (supabase.from('profiles') as any).update({
                full_name: form.full_name.trim(),
                bio_ar: form.bio_ar.trim() || null,
                bio_en: form.bio_en.trim() || null,
                avatar_url: form.avatar_url.trim() || null,
                qualifications: form.qualifications.trim() || null,
                updated_at: new Date().toISOString(),
            }).eq('id', profile.id);

            if (error) throw error;

            await refreshProfile();
            setSaved(true);
            toast.success(t('تم حفظ الملف الشخصي بنجاح', 'Profile saved successfully'));
            setTimeout(() => setSaved(false), 3000);
        } catch (err: any) {
            toast.error(t('فشل في حفظ البيانات', 'Failed to save profile'), {
                description: err.message,
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !profile) return;

        const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            toast.error(t('يرجى اختيار صورة بصيغة JPG أو PNG أو WebP', 'Please select a JPG, PNG, or WebP image'));
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error(t('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'Image must be smaller than 5MB'));
            return;
        }

        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop();
            const fileName = `${Date.now()}.${ext}`;
            const filePath = `${profile.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            const publicUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            setForm((prev) => ({ ...prev, avatar_url: publicUrl }));
            toast.success(t('تم رفع الصورة بنجاح. اضغط حفظ لتطبيق التغييرات.', 'Photo uploaded. Click Save to apply.'));
        } catch (err: any) {
            toast.error(t('فشل في رفع الصورة', 'Failed to upload photo'), {
                description: err.message,
            });
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    if (!profile) {
        return (
            <div className="flex flex-col items-center justify-center p-12 space-y-4">
                {authError ? (
                    <>
                        <p className="text-destructive font-medium">{authError}</p>
                        <Button onClick={() => refreshProfile()}>{t('إعادة المحاولة', 'Retry')}</Button>
                    </>
                ) : (
                    <Loader2 className="w-8 h-8 animate-spin text-primary" />
                )}
            </div>
        );
    }

    const p = profile as any;

    return (
        <div className="max-w-2xl space-y-6">
            <div>
                <h1 className="text-2xl font-semibold text-foreground">
                    {t('ملفي الشخصي', 'My Profile')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('معلوماتك التي تظهر للطلاب', 'Information visible to students')}
                </p>
            </div>

            <form onSubmit={handleSubmit} className="bg-background rounded-xl border border-border p-6 space-y-6">
                {/* Avatar preview */}
                <div className="flex items-center gap-4">
                    <div className="relative flex-shrink-0">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden ring-2 ring-border">
                            {form.avatar_url ? (
                                <img src={form.avatar_url} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = 'none')} />
                            ) : (
                                <User className="w-9 h-9 text-primary" />
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploadingAvatar}
                            className="absolute bottom-0 end-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition-colors disabled:opacity-50"
                            title={t('رفع صورة', 'Upload photo')}
                        >
                            {uploadingAvatar ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,image/gif"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    </div>
                    <div className="flex-1 space-y-1">
                        <Label className="flex items-center gap-2">
                            <Camera className="w-4 h-4" />
                            {t('الصورة الشخصية', 'Profile Photo')}
                        </Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => fileInputRef.current?.click()}
                                disabled={uploadingAvatar}
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="w-4 h-4 animate-spin me-2" />
                                ) : (
                                    <Upload className="w-4 h-4 me-2" />
                                )}
                                {t('رفع من الجهاز', 'Upload from device')}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('JPG، PNG، WebP — حتى 5 ميجابايت', 'JPG, PNG, WebP — up to 5MB')}
                        </p>
                    </div>
                </div>

                {/* Full Name */}
                <div className="space-y-2">
                    <Label htmlFor="full_name">
                        {t('الاسم الكامل', 'Full Name')} <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="full_name"
                        value={form.full_name}
                        onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                        required
                    />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                    <Label>{t('البريد الإلكتروني', 'Email')}</Label>
                    <Input value={p?.email || ''} disabled className="opacity-60" />
                    <p className="text-xs text-muted-foreground">
                        {t('لا يمكن تغيير البريد الإلكتروني', 'Email cannot be changed')}
                    </p>
                </div>

                {/* Qualifications */}
                <div className="space-y-2">
                    <Label htmlFor="qualifications" className="flex items-center gap-2">
                        <Award className="w-4 h-4" />
                        {t('المؤهلات والخبرات', 'Qualifications & Experience')}
                    </Label>
                    <Input
                        id="qualifications"
                        placeholder={t('مثال: ماجستير رياضيات، خبرة 10 سنوات', 'e.g. M.Sc. Mathematics, 10 years experience')}
                        value={form.qualifications}
                        onChange={(e) => setForm({ ...form, qualifications: e.target.value })}
                    />
                </div>

                {/* Bio Arabic */}
                <div className="space-y-2">
                    <Label htmlFor="bio_ar" className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        {t('نبذة تعريفية بالعربية', 'Arabic Bio')}
                    </Label>
                    <Textarea
                        id="bio_ar"
                        dir="rtl"
                        rows={4}
                        placeholder={t('اكتب نبذة عن نفسك بالعربية...', 'Write about yourself in Arabic...')}
                        value={form.bio_ar}
                        onChange={(e) => setForm({ ...form, bio_ar: e.target.value })}
                    />
                </div>

                {/* Bio English */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="bio_en">
                            {t('نبذة تعريفية بالإنجليزية', 'English Bio')}
                        </Label>
                        <TranslationButton
                            sourceText={form.bio_ar}
                            sourceLang="ar" targetLang="en"
                            onTranslated={(text) => setForm(f => ({ ...f, bio_en: text }))}
                            autoTranslating={bioTranslating}
                        />
                    </div>
                    <Textarea
                        id="bio_en"
                        dir="ltr"
                        rows={4}
                        placeholder="Write about yourself in English..."
                        value={form.bio_en}
                        onChange={(e) => setForm({ ...form, bio_en: e.target.value })}
                    />
                </div>

                <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                    {submitting ? (
                        <Loader2 className="w-4 h-4 animate-spin me-2" />
                    ) : (
                        <Save className="w-4 h-4 me-2" />
                    )}
                    {saved ? t('✓ تم الحفظ', '✓ Saved!') : t('حفظ التغييرات', 'Save Changes')}
                </Button>
            </form>
        </div>
    );
}
