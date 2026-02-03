import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { getCourses, getLessons, createLesson, updateLesson, deleteLesson } from '@/services/adminApi';
import type { Course, Lesson } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, ArrowRight, ArrowUp, ArrowDown, RefreshCw, AlertCircle, PlayCircle, FileText } from 'lucide-react';
import { toast } from 'sonner';

type LessonType = 'video' | 'article';

export default function LessonsManagement() {
    const { t } = useLanguage();
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    // State
    const [course, setCourse] = useState<Course | null>(null);
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        slug: '',
        summary_ar: '',
        summary_en: '',
        type: 'video' as LessonType,
        preview_video_url: '',
        full_video_url: '',
        duration_seconds: 0,
        order_index: 0,
        is_free_preview: false,
        is_published: false,
    });

    // Fetch data
    const fetchData = async () => {
        if (!courseId) return;

        setLoading(true);
        setError(null);

        // Fetch course info
        const { data: courses, error: coursesError } = await getCourses();
        if (coursesError) {
            setError(coursesError);
            setLoading(false);
            return;
        }

        const currentCourse = courses?.find(c => c.id === courseId);
        if (!currentCourse) {
            setError(t('الدورة غير موجودة', 'Course not found'));
            setLoading(false);
            return;
        }
        setCourse(currentCourse);

        // Fetch lessons
        const { data: lessonsData, error: lessonsError } = await getLessons(courseId);
        if (lessonsError) {
            setError(lessonsError);
            setLoading(false);
            return;
        }

        setLessons(lessonsData || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [courseId]);

    // Open add dialog
    const handleAdd = () => {
        setEditingLesson(null);
        setForm({
            title_ar: '',
            title_en: '',
            slug: '',
            summary_ar: '',
            summary_en: '',
            type: 'video',
            preview_video_url: '',
            full_video_url: '',
            duration_seconds: 0,
            order_index: lessons.length + 1,
            is_free_preview: false,
            is_published: false,
        });
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setForm({
            title_ar: lesson.title_ar,
            title_en: lesson.title_en || '',
            slug: lesson.slug,
            summary_ar: lesson.summary_ar || '',
            summary_en: lesson.summary_en || '',
            type: lesson.full_video_url ? 'video' : 'article',
            preview_video_url: lesson.preview_video_url || '',
            full_video_url: lesson.full_video_url || '',
            duration_seconds: lesson.duration_seconds || 0,
            order_index: lesson.order_index,
            is_free_preview: lesson.is_free_preview,
            is_published: lesson.is_published,
        });
        setDialogOpen(true);
    };

    // Save (create or update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!courseId) return;

        setSubmitting(true);

        if (editingLesson) {
            // Update
            const { error } = await updateLesson(editingLesson.id, {
                title_ar: form.title_ar,
                title_en: form.title_en || undefined,
                summary_ar: form.summary_ar || undefined,
                summary_en: form.summary_en || undefined,
                preview_video_url: form.preview_video_url || undefined,
                full_video_url: form.full_video_url || undefined,
                duration_seconds: form.duration_seconds || undefined,
                order_index: form.order_index,
                is_free_preview: form.is_free_preview,
                is_published: form.is_published,
            });

            if (error) {
                toast.error(t('فشل في تحديث الدرس', 'Failed to update lesson'), { description: error });
            } else {
                toast.success(t('تم تحديث الدرس بنجاح', 'Lesson updated successfully'));
                setDialogOpen(false);
                fetchData();
            }
        } else {
            // Create
            const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-');
            const { error } = await createLesson({
                course_id: courseId,
                title_ar: form.title_ar,
                title_en: form.title_en || undefined,
                slug,
                summary_ar: form.summary_ar || undefined,
                summary_en: form.summary_en || undefined,
                preview_video_url: form.preview_video_url || undefined,
                full_video_url: form.full_video_url || undefined,
                duration_seconds: form.duration_seconds || undefined,
                order_index: form.order_index,
                is_free_preview: form.is_free_preview,
                is_published: form.is_published,
            });

            if (error) {
                toast.error(t('فشل في إضافة الدرس', 'Failed to add lesson'), { description: error });
            } else {
                toast.success(t('تمت إضافة الدرس بنجاح', 'Lesson added successfully'));
                setDialogOpen(false);
                fetchData();
            }
        }

        setSubmitting(false);
    };

    // Delete
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        const { error } = await deleteLesson(deleteTarget.id);

        if (error) {
            toast.error(t('فشل في حذف الدرس', 'Failed to delete lesson'), { description: error });
        } else {
            toast.success(t('تم حذف الدرس بنجاح', 'Lesson deleted successfully'));
            fetchData();
        }

        setDeleteTarget(null);
        setSubmitting(false);
    };

    // Reorder
    const handleMoveUp = async (lesson: Lesson, index: number) => {
        if (index === 0) return;
        const prevLesson = lessons[index - 1];

        await updateLesson(lesson.id, { order_index: prevLesson.order_index });
        await updateLesson(prevLesson.id, { order_index: lesson.order_index });
        fetchData();
    };

    const handleMoveDown = async (lesson: Lesson, index: number) => {
        if (index === lessons.length - 1) return;
        const nextLesson = lessons[index + 1];

        await updateLesson(lesson.id, { order_index: nextLesson.order_index });
        await updateLesson(nextLesson.id, { order_index: lesson.order_index });
        fetchData();
    };

    const formatDuration = (seconds: number | null) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button
                    onClick={() => navigate('/admin/courses')}
                    className="hover:text-foreground transition-colors"
                >
                    {t('الدورات', 'Courses')}
                </button>
                <ArrowRight className="w-4 h-4" />
                <span className="text-foreground">
                    {course ? course.title_ar : '...'}
                </span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة الدروس', 'Manage Lessons')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {course && t(`دروس دورة: ${course.title_ar}`, `Lessons for: ${course.title_en || course.title_ar}`)}
                    </p>
                </div>
                <Button onClick={handleAdd}>
                    <Plus className="w-4 h-4 me-2" />
                    {t('إضافة درس', 'Add Lesson')}
                </Button>
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">{t('حدث خطأ', 'An error occurred')}</p>
                            <p className="text-xs text-destructive/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : lessons.length === 0 ? (
                    <div className="p-12 text-center">
                        <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {t('لا توجد دروس', 'No lessons')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('ابدأ بإضافة أول درس', 'Start by adding the first lesson')}
                        </p>
                        <Button onClick={handleAdd}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('إضافة درس', 'Add Lesson')}
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>{t('عنوان الدرس', 'Lesson Title')}</TableHead>
                                <TableHead>{t('النوع', 'Type')}</TableHead>
                                <TableHead>{t('المدة', 'Duration')}</TableHead>
                                <TableHead>{t('معاينة مجانية', 'Free Preview')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead className="w-[150px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {lessons.map((lesson, index) => (
                                <TableRow key={lesson.id}>
                                    <TableCell className="text-muted-foreground">{lesson.order_index}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-foreground">{lesson.title_ar}</p>
                                            {lesson.title_en && (
                                                <p className="text-sm text-muted-foreground">{lesson.title_en}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {lesson.full_video_url ? (
                                                <>
                                                    <PlayCircle className="w-4 h-4 text-blue-500" />
                                                    <span className="text-sm">{t('فيديو', 'Video')}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <FileText className="w-4 h-4 text-green-500" />
                                                    <span className="text-sm">{t('مقال', 'Article')}</span>
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {formatDuration(lesson.duration_seconds)}
                                    </TableCell>
                                    <TableCell>
                                        {lesson.is_free_preview && (
                                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                {t('مجاني', 'Free')}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={lesson.is_published ? 'default' : 'secondary'}>
                                            {lesson.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleMoveUp(lesson, index)}
                                                disabled={index === 0}
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleMoveDown(lesson, index)}
                                                disabled={index === lessons.length - 1}
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(lesson)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget(lesson)}
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLesson
                                ? t('تعديل الدرس', 'Edit Lesson')
                                : t('إضافة درس جديد', 'Add New Lesson')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title_ar">{t('العنوان بالعربية', 'Arabic Title')} *</Label>
                                <Input
                                    id="title_ar"
                                    value={form.title_ar}
                                    onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="title_en">{t('العنوان بالإنجليزية', 'English Title')}</Label>
                                <Input
                                    id="title_en"
                                    value={form.title_en}
                                    onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">{t('نوع الدرس', 'Lesson Type')}</Label>
                            <Select value={form.type} onValueChange={(val: LessonType) => setForm({ ...form, type: val })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="video">{t('فيديو', 'Video')}</SelectItem>
                                    <SelectItem value="article">{t('مقال', 'Article')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {form.type === 'video' && (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="full_video_url">{t('رابط الفيديو الكامل', 'Full Video URL')}</Label>
                                    <Input
                                        id="full_video_url"
                                        value={form.full_video_url}
                                        onChange={(e) => setForm({ ...form, full_video_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="preview_video_url">{t('رابط فيديو المعاينة', 'Preview Video URL')}</Label>
                                    <Input
                                        id="preview_video_url"
                                        value={form.preview_video_url}
                                        onChange={(e) => setForm({ ...form, preview_video_url: e.target.value })}
                                        placeholder="https://..."
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="duration">{t('المدة (بالثواني)', 'Duration (seconds)')}</Label>
                                    <Input
                                        id="duration"
                                        type="number"
                                        value={form.duration_seconds}
                                        onChange={(e) => setForm({ ...form, duration_seconds: parseInt(e.target.value) || 0 })}
                                    />
                                </div>
                            </>
                        )}

                        {form.type === 'article' && (
                            <div className="space-y-2">
                                <Label htmlFor="summary_ar">{t('محتوى المقال', 'Article Content')}</Label>
                                <Textarea
                                    id="summary_ar"
                                    value={form.summary_ar}
                                    onChange={(e) => setForm({ ...form, summary_ar: e.target.value })}
                                    rows={6}
                                />
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_free_preview">{t('معاينة مجانية', 'Free Preview')}</Label>
                                <Switch
                                    id="is_free_preview"
                                    checked={form.is_free_preview}
                                    onCheckedChange={(checked) => setForm({ ...form, is_free_preview: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_published">{t('منشور', 'Published')}</Label>
                                <Switch
                                    id="is_published"
                                    checked={form.is_published}
                                    onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حفظ', 'Save')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('تأكيد الحذف', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(
                                `هل أنت متأكد من حذف الدرس "${deleteTarget?.title_ar}"؟`,
                                `Are you sure you want to delete "${deleteTarget?.title_en || deleteTarget?.title_ar}"?`
                            )}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حذف', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
