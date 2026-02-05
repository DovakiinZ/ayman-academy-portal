import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { TranslationButton } from '@/components/admin/TranslationButton';
import { dummyLessons } from '@/data/dummy';
import type { Subject, Lesson } from '@/types/database';
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
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, RefreshCw, AlertCircle, PlayCircle, Beaker, ChevronRight, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

export default function LessonsManagement() {
    const { t } = useLanguage();
    const params = useParams<{ subjectId?: string }>();
    const subjectId = params.subjectId;
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    // State
    const [subject, setSubject] = useState<Subject | null>(null);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]); // For dropdown
    const [lessons, setLessons] = useState<Lesson[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        subject_id: '',
        title_ar: '',
        title_en: '',
        slug: '',
        video_url: '',
        summary_ar: '',
        summary_en: '',
        order_index: 0,
        is_published: false,
        is_paid: true,
    });

    // Fetch data
    const fetchData = async () => {
        if (!mountedRef.current) return;



        setLoading(true);
        setError(null);

        try {
            // Fetch all subjects for dropdown
            const { data: subjectsData } = await supabase
                .from('subjects')
                .select('id, title_ar')
                .order('sort_order');

            if (mountedRef.current && subjectsData) {
                setAllSubjects(subjectsData as Subject[]);
            }

            if (!subjectId) {
                setLoading(false);
                return;
            }

            const startTime = Date.now();
            // ... (rest of logic)
            devLog(`Fetching subject ${subjectId} and lessons...`);

            // Fetch subject info with stage
            const { data: subjectData, error: subjectError } = await supabase
                .from('subjects')
                .select('*, stage:stages(*)')
                .eq('id', subjectId)
                .single();

            if (!mountedRef.current) return;

            if (subjectError) {
                devLog('Subject fetch error', subjectError);
                setError(subjectError.message);
                setLessons(dummyLessons.filter(l => l.subject_id === subjectId) as Lesson[]);
                setIsDummy(true);
                setLoading(false);
                return;
            }

            setSubject(subjectData as Subject);

            // Fetch lessons for this subject
            const { data: lessonsData, error: lessonsError } = await supabase
                .from('lessons')
                .select('*')
                .eq('subject_id', subjectId)
                .order('order_index', { ascending: true });

            if (!mountedRef.current) return;

            if (lessonsError) {
                devLog('Lessons fetch error', lessonsError);
                setError(lessonsError.message);
                setLessons(dummyLessons.filter(l => l.subject_id === subjectId) as Lesson[]);
                setIsDummy(true);
            } else {
                setLessons((lessonsData as Lesson[]) || []);
                setIsDummy(false);
            }

            const duration = Date.now() - startTime;
            devLog(`Data loaded in ${duration}ms`, { lessonsCount: lessonsData?.length || 0 });
        } catch (err) {
            if (mountedRef.current) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                devLog('Fetch exception', err);
                setError(message);
                // STRICT PERSISTENCE: Do not fall back to dummy data
                // setLessons(dummyLessons as Lesson[]);
                // setIsDummy(true);
                setLessons([]); // Clear list on error
            }
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [subjectId]);

    const handleRetry = () => {
        fetchData();
    };

    // Open add dialog
    // Open add dialog
    const handleAdd = () => {
        // ALLOW even if !subjectId
        setEditingLesson(null);
        setForm({
            subject_id: subjectId || '',
            title_ar: '',
            title_en: '',
            slug: '',
            video_url: '',
            summary_ar: '',
            summary_en: '',
            order_index: lessons.length + 1,
            is_published: false,
            is_paid: true,
        });
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (lesson: Lesson) => {
        setEditingLesson(lesson);
        setForm({
            subject_id: lesson.subject_id || '',
            title_ar: lesson.title_ar,
            title_en: lesson.title_en || '',
            slug: lesson.slug || '',
            video_url: lesson.video_url || lesson.full_video_url || '',
            summary_ar: lesson.summary_ar || '',
            summary_en: lesson.summary_en || '',
            order_index: lesson.order_index,
            is_published: lesson.is_published,
            is_paid: lesson.is_paid,
        });
        setDialogOpen(true);
    };

    // Save (create or update) with verification
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        const targetSubjectId = form.subject_id || subjectId;
        if (!targetSubjectId) {
            toast.error(t('الرجاء اختيار مادة', 'Please select a subject'));
            return;
        }

        if (!form.title_ar.trim()) {
            toast.error(t('الرجاء إدخال عنوان الدرس', 'Please enter lesson title'));
            return;
        }

        setSubmitting(true);

        try {
            if (editingLesson) {
                // Update with verification
                const result = await verifiedUpdate(
                    'lessons',
                    editingLesson.id,
                    {
                        subject_id: targetSubjectId,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        video_url: form.video_url || null,
                        summary_ar: form.summary_ar || null,
                        summary_en: form.summary_en || null,
                        order_index: form.order_index,
                        is_published: form.is_published,
                        is_paid: form.is_paid,
                    },
                    {
                        successMessage: { ar: 'تم تحديث الدرس بنجاح', en: 'Lesson updated successfully' },
                        errorMessage: { ar: 'فشل في تحديث الدرس', en: 'Failed to update lesson' },
                    }
                );

                if (result.success) {
                    setDialogOpen(false);
                    fetchData();
                }
            } else {
                // Create with verification
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');

                const result = await verifiedInsert(
                    'lessons',
                    {
                        subject_id: targetSubjectId,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        slug,
                        video_url: form.video_url || null,
                        summary_ar: form.summary_ar || null,
                        summary_en: form.summary_en || null,
                        order_index: form.order_index,
                        is_published: form.is_published,
                        is_paid: form.is_paid,
                    },
                    {
                        successMessage: { ar: 'تمت إضافة الدرس بنجاح', en: 'Lesson added successfully' },
                        errorMessage: { ar: 'فشل في إضافة الدرس', en: 'Failed to add lesson' },
                    }
                );

                if (result.success) {
                    setDialogOpen(false);
                    if (!subjectId) {
                        navigate(`/admin/subjects/${targetSubjectId}/lessons`);
                    } else {
                        fetchData();
                    }
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    // Delete with verification
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            const result = await verifiedDelete(
                'lessons',
                deleteTarget.id,
                {
                    successMessage: { ar: 'تم حذف الدرس بنجاح', en: 'Lesson deleted successfully' },
                    errorMessage: { ar: 'فشل في حذف الدرس', en: 'Failed to delete lesson' },
                }
            );

            if (result.success) {
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    // Reorder with verification
    const handleMoveUp = async (lesson: Lesson, index: number) => {
        if (index === 0) return;
        const prevLesson = lessons[index - 1];

        // Swap order indices
        await verifiedUpdate('lessons', lesson.id, { order_index: prevLesson.order_index }, { showErrorToast: false });
        await verifiedUpdate('lessons', prevLesson.id, { order_index: lesson.order_index }, { showErrorToast: false });
        fetchData();
    };

    const handleMoveDown = async (lesson: Lesson, index: number) => {
        if (index === lessons.length - 1) return;
        const nextLesson = lessons[index + 1];

        // Swap order indices
        await verifiedUpdate('lessons', lesson.id, { order_index: nextLesson.order_index }, { showErrorToast: false });
        await verifiedUpdate('lessons', nextLesson.id, { order_index: lesson.order_index }, { showErrorToast: false });
        fetchData();
    };

    // Navigate back
    const handleBackToSubject = () => {
        if (subject?.stage_id) {
            navigate(`/admin/stages/${subject.stage_id}/subjects`);
        } else {
            navigate('/admin/stages');
        }
    };

    return (
        <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <button
                    onClick={() => navigate('/admin/stages')}
                    className="hover:text-foreground transition-colors"
                >
                    {t('المراحل', 'Stages')}
                </button>
                <ChevronRight className="w-4 h-4" />
                <button
                    onClick={handleBackToSubject}
                    className="hover:text-foreground transition-colors"
                >
                    {subject?.stage?.title_ar || t('المواد', 'Subjects')}
                </button>
                <ChevronRight className="w-4 h-4" />
                <span className="text-foreground">
                    {subject ? t(subject.title_ar, subject.title_en || subject.title_ar) : '...'}
                </span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة الدروس', 'Manage Lessons')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {subject && t(`دروس مادة: ${subject.title_ar}`, `Lessons for: ${subject.title_en || subject.title_ar}`)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {isDummy && !loading && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
                            <Beaker className="w-3.5 h-3.5" />
                            {t('بيانات تجريبية', 'Demo Data')}
                        </div>
                    )}
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة درس', 'Add Lesson')}
                    </Button>
                </div>
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
                        <Button variant="outline" size="sm" onClick={handleRetry}>
                            <RefreshCw className="w-4 h-4 me-2" />
                            {t('إعادة المحاولة', 'Retry')}
                        </Button>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {!subjectId ? (
                    <div className="p-12 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {t('يرجى اختيار مادة لعرض الدروس', 'Please select a subject to view lessons')}
                        </h3>
                        <Button variant="outline" onClick={() => navigate('/admin/subjects')}>
                            {t('الذهاب للمواد', 'Go to Subjects')}
                        </Button>
                    </div>
                ) : loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : lessons.length === 0 && !isDummy ? (
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
                                <TableHead>{t('مدفوع', 'Paid')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead className="w-[180px]">{t('الإجراءات', 'Actions')}</TableHead>
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
                                            {lesson.summary_ar && (
                                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lesson.summary_ar}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={lesson.is_paid ? 'default' : 'outline'} className={lesson.is_paid ? '' : 'text-green-600 border-green-200 bg-green-50'}>
                                            {lesson.is_paid ? t('مدفوع', 'Paid') : t('مجاني', 'Free')}
                                        </Badge>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingLesson
                                ? t('تعديل الدرس', 'Edit Lesson')
                                : t('إضافة درس جديد', 'Add New Lesson')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        {!subjectId && (
                            <div className="space-y-2">
                                <Label>{t('المادة', 'Subject')} *</Label>
                                <Select
                                    value={form.subject_id}
                                    onValueChange={(value) => setForm({ ...form, subject_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر مادة', 'Select Subject')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allSubjects.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.title_ar}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
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
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="title_en">{t('العنوان بالإنجليزية', 'English Title')}</Label>
                                    <TranslationButton
                                        sourceText={form.title_ar}
                                        sourceLang="ar"
                                        targetLang="en"
                                        onTranslated={(text) => setForm({ ...form, title_en: text })}
                                        label="Auto EN"
                                    />
                                </div>
                                <Input
                                    id="title_en"
                                    value={form.title_en}
                                    onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                                />
                            </div>
                        </div>
                        {!editingLesson && (
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('المعرّف', 'Slug')}</Label>
                                <Input
                                    id="slug"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    placeholder="lesson-title"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('سيتم إنشاؤه تلقائياً إذا تُرك فارغاً', 'Will be auto-generated if left empty')}
                                </p>
                            </div>
                        )}
                        {/* Video URL */}
                        <div className="space-y-2">
                            <Label htmlFor="video_url">{t('رابط الفيديو', 'Video URL')}</Label>
                            <Input
                                id="video_url"
                                value={form.video_url}
                                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                                placeholder="https://vimeo.com/..."
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="summary_ar">{t('ملخص بالعربية', 'Arabic Summary')}</Label>
                            <Textarea
                                id="summary_ar"
                                value={form.summary_ar}
                                onChange={(e) => setForm({ ...form, summary_ar: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="summary_en">{t('ملخص بالإنجليزية', 'English Summary')}</Label>
                                <TranslationButton
                                    sourceText={form.summary_ar}
                                    sourceLang="ar"
                                    targetLang="en"
                                    onTranslated={(text) => setForm({ ...form, summary_en: text })}
                                    label="Auto EN"
                                />
                            </div>
                            <Textarea
                                id="summary_en"
                                value={form.summary_en}
                                onChange={(e) => setForm({ ...form, summary_en: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="order_index">{t('الترتيب', 'Order')}</Label>
                            <Input
                                id="order_index"
                                type="number"
                                value={form.order_index}
                                onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_paid">{t('درس مدفوع', 'Paid Lesson')}</Label>
                            <Switch
                                id="is_paid"
                                checked={form.is_paid}
                                onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })}
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
        </div >
    );
}
