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
import { Loader2, Save, Trash2, Globe, BookOpen, CreditCard } from 'lucide-react';
import { toast } from 'sonner';

export default function CourseEditor() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    const isEditing = courseId && courseId !== 'new';

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [stages, setStages] = useState<any[]>([]);
    const [subjects, setSubjects] = useState<any[]>([]);
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        level_id: '',
        subject_id: '',
        is_published: false,
        is_paid: false,
        price_amount: 0,
    });

    useEffect(() => {
        async function fetchData() {
            setLoading(true);

            // Fetch stages and subjects
            const [stagesRes, subjectsRes] = await Promise.all([
                supabase.from('stages').select('*').order('sort_order'),
                supabase.from('subjects').select('*').order('title_ar')
            ]);

            if (stagesRes.data) setStages(stagesRes.data);
            if (subjectsRes.data) setSubjects(subjectsRes.data);

            // Fetch course if editing
            if (isEditing && courseId) {
                const { data, error } = await supabase
                    .from('courses')
                    .select('*')
                    .eq('id', courseId)
                    .eq('teacher_id', user?.id)
                    .single();

                if (error) {
                    toast.error(t('فشل في تحميل بيانات الدورة', 'Failed to load course data'));
                } else if (data) {
                    const d = data as any;
                    setForm({
                        title_ar: d.title_ar || '',
                        title_en: d.title_en || '',
                        description_ar: d.description_ar || '',
                        description_en: d.description_en || '',
                        level_id: d.level_id || '',
                        subject_id: d.subject_id || '',
                        is_published: d.is_published || false,
                        is_paid: d.is_paid || false,
                        price_amount: d.price_amount || 0,
                    });
                }
            }
            setLoading(false);
        }

        fetchData();
    }, [courseId, isEditing, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        setSubmitting(true);

        const courseData = {
            title_ar: form.title_ar,
            title_en: form.title_en || null,
            description_ar: form.description_ar || null,
            description_en: form.description_en || null,
            level_id: form.level_id,
            subject_id: form.subject_id || null,
            is_published: form.is_published,
            is_paid: form.is_paid,
            price_amount: form.is_paid ? form.price_amount : 0,
            updated_at: new Date().toISOString(),
        };

        try {
            if (isEditing) {
                const { error } = await (supabase
                    .from('courses') as any)
                    .update(courseData)
                    .eq('id', courseId);
                if (error) throw error;
                toast.success(t('تم تحديث الدورة بنجاح', 'Course updated successfully'));
            } else {
                const slug = form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');
                const { error } = await (supabase.from('courses') as any).insert({
                    ...courseData,
                    slug,
                    teacher_id: user.id,
                    created_at: new Date().toISOString(),
                });
                if (error) throw error;
                toast.success(t('تم إنشاء الدورة بنجاح', 'Course created successfully'));
            }
            navigate('/teacher/courses');
        } catch (error: any) {
            toast.error(t('فشل في حفظ التغييرات', 'Failed to save changes'), {
                description: error.message
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirm(t('هل أنت متأكد من حذف هذه الدورة؟', 'Are you sure you want to delete this course?'))) {
            return;
        }
        setDeleting(true);
        try {
            const { error } = await supabase.from('courses').delete().eq('id', courseId);
            if (error) throw error;
            toast.success(t('تم حذف الدورة بنجاح', 'Course deleted successfully'));
            navigate('/teacher/courses');
        } catch (error: any) {
            toast.error(t('فشل في حذف الدورة', 'Failed to delete course'), {
                description: error.message
            });
        } finally {
            setDeleting(false);
        }
    };

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
                        <Label htmlFor="level_id">{t('المرحلة الدراسية', 'Educational Stage')} *</Label>
                        <Select value={form.level_id} onValueChange={(value) => setForm({ ...form, level_id: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('اختر المرحلة', 'Select stage')} />
                            </SelectTrigger>
                            <SelectContent>
                                {stages.map((stage) => (
                                    <SelectItem key={stage.id} value={stage.id}>
                                        {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="subject_id">{t('المادة الدراسية', 'Subject')} *</Label>
                        <Select value={form.subject_id} onValueChange={(value) => setForm({ ...form, subject_id: value })}>
                            <SelectTrigger>
                                <SelectValue placeholder={t('اختر المادة', 'Select subject')} />
                            </SelectTrigger>
                            <SelectContent>
                                {subjects.map((subject) => (
                                    <SelectItem key={subject.id} value={subject.id}>
                                        {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="border-t border-border pt-4 mt-4 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CreditCard className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <Label>{t('دورة مدفوعة', 'Paid Course')}</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('إتاحة الدورة كمتوفرة للشراء', 'Make this course available for purchase')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={form.is_paid}
                                onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })}
                            />
                        </div>

                        {form.is_paid && (
                            <div className="space-y-2">
                                <Label htmlFor="price_amount">{t('سعر الدورة', 'Course Price')}</Label>
                                <Input
                                    id="price_amount"
                                    type="number"
                                    value={form.price_amount}
                                    onChange={(e) => setForm({ ...form, price_amount: parseFloat(e.target.value) || 0 })}
                                    className="max-w-[200px]"
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Globe className="w-4 h-4 text-muted-foreground" />
                                <div>
                                    <Label>{t('نشر الدورة', 'Publish Course')}</Label>
                                    <p className="text-xs text-muted-foreground">
                                        {t('الدورات المنشورة تظهر للطلاب', 'Published courses are visible to students')}
                                    </p>
                                </div>
                            </div>
                            <Switch
                                checked={form.is_published}
                                onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button type="submit" disabled={submitting || !form.title_ar || !form.level_id || !form.subject_id}>
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
