import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { TranslationButton } from '@/components/admin/TranslationButton';
import type { Lesson, Course } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Plus, Pencil, Trash2, ArrowLeft, ArrowRight, Video } from 'lucide-react';

export default function LessonEditor() {
    const { t, direction } = useLanguage();
    const { user } = useAuth();
    const navigate = useNavigate();
    const { courseId } = useParams<{ courseId: string }>();
    const ArrowIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        description_ar: '',
        video_url: '',
        duration_minutes: '',
        is_free: false,
    });

    const { isTranslating: titleTranslating } = useAutoTranslate(
        form.title_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, title_en: text })),
        dialogOpen
    );

    const fetchData = async () => {
        if (!courseId || !user) return;

        const [courseRes, lessonsRes] = await Promise.all([
            supabase.from('courses').select('*').eq('id', courseId).eq('teacher_id', user.id).single(),
            supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
        ]);

        if (!courseRes.data) {
            navigate('/teacher/courses');
            return;
        }

        setCourse(courseRes.data);
        setLessons(lessonsRes.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [courseId, user]);

    const resetForm = () => {
        setForm({
            title_ar: '',
            title_en: '',
            description_ar: '',
            video_url: '',
            duration_minutes: '',
            is_free: false,
        });
        setEditingLesson(null);
    };

    const openEdit = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setForm({
            title_ar: lesson.title_ar,
            title_en: lesson.title_en || '',
            description_ar: lesson.description_ar || '',
            video_url: lesson.video_url || '',
            duration_minutes: lesson.duration_minutes?.toString() || '',
            is_free: lesson.is_free,
        });
        setDialogOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const lessonData = {
            title_ar: form.title_ar,
            title_en: form.title_en || null,
            description_ar: form.description_ar || null,
            video_url: form.video_url || null,
            duration_minutes: form.duration_minutes ? parseInt(form.duration_minutes) : null,
            is_free: form.is_free,
        };

        if (editingLesson) {
            await supabase
                .from('lessons')
                .update({ ...lessonData, updated_at: new Date().toISOString() })
                .eq('id', editingLesson.id);
        } else {
            await supabase.from('lessons').insert({
                ...lessonData,
                course_id: courseId,
                order_index: lessons.length,
            });
        }

        setDialogOpen(false);
        resetForm();
        fetchData();
        setSubmitting(false);
    };

    const handleDelete = async (lessonId: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا الدرس؟', 'Are you sure you want to delete this lesson?'))) {
            return;
        }
        await supabase.from('lessons').delete().eq('id', lessonId);
        fetchData();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div>
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" asChild>
                    <Link to="/teacher/courses">
                        <ArrowIcon className="w-5 h-5" />
                    </Link>
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('دروس الدورة', 'Course Lessons')}
                    </h1>
                    <p className="text-sm text-muted-foreground">{course?.title_ar}</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 me-2" />
                            {t('درس جديد', 'New Lesson')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>
                                {editingLesson ? t('تعديل الدرس', 'Edit Lesson') : t('إضافة درس جديد', 'Add New Lesson')}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="title_ar">{t('عنوان الدرس (عربي)', 'Lesson Title (Arabic)')} *</Label>
                                <Input
                                    id="title_ar"
                                    value={form.title_ar}
                                    onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="title_en">{t('عنوان الدرس (إنجليزي)', 'Lesson Title (English)')}</Label>
                                    <TranslationButton sourceText={form.title_ar} sourceLang="ar" targetLang="en"
                                        onTranslated={(text) => setForm(f => ({ ...f, title_en: text }))}
                                        autoTranslating={titleTranslating} />
                                </div>
                                <Input
                                    id="title_en"
                                    dir="ltr"
                                    value={form.title_en}
                                    onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                                    placeholder="e.g. Introduction to Algebra"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="video_url">{t('رابط الفيديو', 'Video URL')}</Label>
                                <Input
                                    id="video_url"
                                    value={form.video_url}
                                    onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="duration">{t('المدة (دقائق)', 'Duration (min)')}</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={form.duration_minutes}
                                        onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>{t('درس مجاني', 'Free Lesson')}</Label>
                                    <div className="pt-2">
                                        <Switch
                                            checked={form.is_free}
                                            onCheckedChange={(checked) => setForm({ ...form, is_free: checked })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description_ar">{t('الوصف', 'Description')}</Label>
                                <Textarea
                                    id="description_ar"
                                    value={form.description_ar}
                                    onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                                    rows={2}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting || !form.title_ar}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حفظ', 'Save')}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {lessons.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        {t('لا توجد دروس بعد', 'No lessons yet')}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[50px]">#</TableHead>
                                <TableHead>{t('عنوان الدرس', 'Lesson Title')}</TableHead>
                                <TableHead>{t('المدة', 'Duration')}</TableHead>
                                <TableHead>{t('مجاني', 'Free')}</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lessons.map((lesson, index) => (
                                <TableRow key={lesson.id}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {lesson.video_url && <Video className="w-4 h-4 text-muted-foreground" />}
                                            {lesson.title_ar}
                                        </div>
                                    </TableCell>
                                    <TableCell>{lesson.duration_minutes ? `${lesson.duration_minutes} ${t('دقيقة', 'min')}` : '-'}</TableCell>
                                    <TableCell>{lesson.is_free ? t('نعم', 'Yes') : t('لا', 'No')}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => openEdit(lesson)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(lesson.id)}>
                                                <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>
        </div>
    );
}
