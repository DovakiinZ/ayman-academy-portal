import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, User, Users, Camera, X } from 'lucide-react';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { Stage } from '@/types/database';
import { Switch } from '@/components/ui/switch';

export default function TeacherProfile() {
    const { t } = useLanguage();
    const { profile, refreshProfile } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [saved, setSaved] = useState(false);
    const [form, setForm] = useState({
        full_name: profile?.full_name || '',
        bio_ar: profile?.bio_ar || '',
        bio_en: profile?.bio_en || '',
        expertise_tags_ar: (profile as any)?.expertise_tags_ar || [],
        expertise_tags_en: (profile as any)?.expertise_tags_en || [],
        avatar_url: profile?.avatar_url || '',
        featured_stages: (profile as any)?.featured_stages || [],
    });
    const [allStages, setAllStages] = useState<Stage[]>([]);
    const [loadingStages, setLoadingStages] = useState(true);

    useEffect(() => {
        fetchStages();
    }, []);

    const fetchStages = async () => {
        const { data, error } = await supabase
            .from('stages')
            .select('*')
            .eq('is_active', true)
            .order('sort_order', { ascending: true });

        if (!error && data) {
            setAllStages(data as Stage[]);
        }
        setLoadingStages(false);
    };

    const toggleStage = (stageId: string) => {
        const current = form.featured_stages;
        const updated = current.includes(stageId)
            ? current.filter((id: string) => id !== stageId)
            : [...current, stageId];
        setForm({ ...form, featured_stages: updated });
    };
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(getAvatarUrl(profile?.avatar_url));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!profile) return;
        setSubmitting(true);

        let finalAvatarUrl = form.avatar_url;

        if (avatarFile) {
            const { url, error: uploadError } = await uploadAvatar(profile.id, avatarFile);
            if (uploadError) {
                toast.error(t('فشل في رفع الصورة', 'Failed to upload image'));
                setSubmitting(false);
                return;
            }
            if (url) finalAvatarUrl = url;
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                full_name: form.full_name,
                bio_ar: form.bio_ar || null,
                bio_en: form.bio_en || null,
                expertise_tags_ar: form.expertise_tags_ar,
                expertise_tags_en: form.expertise_tags_en,
                avatar_url: finalAvatarUrl || null,
                featured_stages: form.featured_stages,
                updated_at: new Date().toISOString(),
            } as any)
            .eq('id', profile.id);

        if (updateError) {
            toast.error(t('فشل في حفظ البيانات', 'Failed to save changes'));
            setSubmitting(false);
            return;
        }

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
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-secondary overflow-hidden flex items-center justify-center border-2 border-primary/20">
                            {avatarPreview ? (
                                <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 text-muted-foreground" />
                            )}
                        </div>
                        <label className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                            <Camera className="w-5 h-5" />
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                        setAvatarFile(file);
                                        setAvatarPreview(URL.createObjectURL(file));
                                    }
                                }}
                            />
                        </label>
                    </div>
                    <div>
                        <p className="font-medium text-lg text-foreground">{profile?.full_name || profile?.email}</p>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="bio_ar">{t('السيرة الذاتية (بالعربية)', 'Bio (Arabic)')}</Label>
                        <Textarea
                            id="bio_ar"
                            value={form.bio_ar}
                            onChange={(e) => setForm({ ...form, bio_ar: e.target.value })}
                            rows={3}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="bio_en">{t('السيرة الذاتية (بالإنجليزية)', 'Bio (English)')}</Label>
                        <Textarea
                            id="bio_en"
                            value={form.bio_en}
                            onChange={(e) => setForm({ ...form, bio_en: e.target.value })}
                            rows={3}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="tags_ar">{t('التخصصات (بالعربية، مفصولة بفاصلة)', 'Expertise Tags (Arabic, comma separated)')}</Label>
                    <Input
                        id="tags_ar"
                        value={form.expertise_tags_ar.join(', ')}
                        onChange={(e) => setForm({ ...form, expertise_tags_ar: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="رياضيات، فيزياء"
                    />
                </div>

                <div className="space-y-4 pt-4 border-t border-border">
                    <Label className="text-base font-medium">{t('المراحل الدراسية', 'Educational Stages')}</Label>
                    <p className="text-xs text-muted-foreground -mt-2">
                        {t('اختر المراحل التي تدرسها لتظهر في ملفك الشخصي', 'Select the stages you teach to show on your profile')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-secondary/20 p-4 rounded-lg border border-border">
                        {allStages.map(stage => (
                            <div key={stage.id} className="flex items-center justify-between p-2 bg-background rounded border border-border/50">
                                <Label htmlFor={`stage-${stage.id}`} className="text-sm cursor-pointer flex-1">
                                    {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                </Label>
                                <Switch
                                    id={`stage-${stage.id}`}
                                    checked={form.featured_stages.includes(stage.id)}
                                    onCheckedChange={() => toggleStage(stage.id)}
                                />
                            </div>
                        ))}
                        {loadingStages && (
                            <div className="col-span-full flex justify-center py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                            </div>
                        )}
                        {!loadingStages && allStages.length === 0 && (
                            <p className="text-center text-xs text-muted-foreground col-span-full">
                                {t('لا توجد مراحل متاحة', 'No stages available')}
                            </p>
                        )}
                    </div>
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
