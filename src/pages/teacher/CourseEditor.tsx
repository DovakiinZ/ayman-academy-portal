import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Course } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2, Save, Trash2 } from 'lucide-react';

export default function CourseEditor() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    const isEditing = courseId && courseId !== 'new';

    const [loading, setLoading] = useState(isEditing);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        stage_id: '',
        is_published: false,
    });

    useEffect(() => {
        if (isEditing && courseId) {
            supabase
                .from('courses')
                .select('*')
                .eq('id', courseId)
                .eq('teacher_id', user?.id)
                .single()
                .then(({ data }) => {
                    if (data) {
                        setForm({
                            title_ar: data.title_ar || '',
                            title_en: data.title_en || '',
                            description_ar: data.description_ar || '',
                            description_en: data.description_en || '',
                            stage_id: data.stage_id || '',
                            is_published: data.is_published || false,
                        });
                    }
                    setLoading(false);
                });
        }
    }, [courseId, isEditing, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        if (isEditing) {
            await supabase
                .from('courses')
                .update({
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    description_ar: form.description_ar || null,
                    description_en: form.description_en || null,
                    stage_id: form.stage_id,
                    is_published: form.is_published,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', courseId);
        } else {
            await supabase.from('courses').insert({
                title_ar: form.title_ar,
                title_en: form.title_en || null,
                description_ar: form.description_ar || null,
                description_en: form.description_en || null,
                stage_id: form.stage_id,
                teacher_id: user.id,
                is_published: form.is_published,
            });
        }

        navigate('/teacher/courses');
    };

    const handleDelete = async () => {
        if (!confirm(t('هل أنت متأكد من حذف هذه الدورة؟', 'Are you sure you want to delete this course?'))) {
            return;
        }
        setDeleting(true);
        await supabase.from('courses').delete().eq('id', courseId);
        navigate('/teacher/courses');
    };

    const stages = [
        { value: 'tamhidi', label: { ar: 'تمهيدي', en: 'Preparatory' } },
        { value: 'ibtidai', label: { ar: 'ابتدائي', en: 'Primary' } },
        { value: 'mutawasit', label: { ar: 'متوسط', en: 'Middle' } },
    ];

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="max-w-2xl">
            <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">
                    {isEditing ? t('تعديل الدورة', 'Edit Course') : t('إنشاء دورة جديدة', 'Create New Course')}
                </h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="bg-background rounded-lg border border-border p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="title_ar">{t('عنوان الدورة (عربي)', 'Course Title (Arabic)')} *</Label>
                        <Input
                            id="title_ar"
                            value={form.title_ar}
                            onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="title_en">{t('عنوان الدورة (إنجليزي)', 'Course Title (English)')}</Label>
                        <Input
                            id="title_en"
                            value={form.title_en}
                            onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description_ar">{t('الوصف (عربي)', 'Description (Arabic)')}</Label>
                        <Textarea
                            id="description_ar"
                            value={form.description_ar}
                            onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                            rows={3}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage_id">{t('المرحلة الدراسية', 'Educational Stage')} *</Label>
                        <Select value={form.stage_id} onValueChange={(value) => setForm({ ...form, stage_id: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('اختر المرحلة', 'Select stage')} />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map((stage) => (
                                    <SelectItem key={stage.value} value={stage.value}>
                                        {t(stage.label.ar, stage.label.en)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <div>
                            <Label>{t('نشر الدورة', 'Publish Course')}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t('الدورات المنشورة تظهر للطلاب', 'Published courses are visible to students')}
                            </p>
                        </div>
                        <Switch
                            checked={form.is_published}
                            onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                        />
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button type="submit" disabled={submitting || !form.title_ar || !form.stage_id}>
                        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 me-2" />}
                        {isEditing ? t('حفظ التغييرات', 'Save Changes') : t('إنشاء الدورة', 'Create Course')}
                    </Button>

                    {isEditing && (
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
                            {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 me-2" />}
                            {t('حذف', 'Delete')}
                        </Button>
                    )}
                </div>
            </form>
        </div>
    );
}
