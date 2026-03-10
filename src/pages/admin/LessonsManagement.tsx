import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { TranslationButton } from '@/components/admin/TranslationButton';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
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
import { Loader2, Plus, Pencil, Trash2, ArrowUp, ArrowDown, RefreshCw, AlertCircle, PlayCircle, ChevronRight, BookOpen, BrainCircuit, Search, Filter, X } from 'lucide-react';
import { toast } from 'sonner';
import QuizEditor from '@/components/admin/QuizEditor';

interface Stage {
    id: string;
    title_ar: string;
    title_en?: string | null;
    sort_order: number;
}

interface LessonWithJoins extends Lesson {
    subject?: {
        id: string;
        title_ar: string;
        title_en?: string | null;
        stage_id?: string;
        stage?: Stage | null;
    } | null;
}

export default function LessonsManagement() {
    const { t } = useLanguage();
    const params = useParams<{ subjectId?: string }>();
    const subjectId = params.subjectId;
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    const [lessons, setLessons] = useState<LessonWithJoins[]>([]);
    const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
    const [allStages, setAllStages] = useState<Stage[]>([]);
    const [subject, setSubject] = useState<Subject | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterStage, setFilterStage] = useState<string>('all');
    const [filterSubject, setFilterSubject] = useState<string>('all');
    const [filterPublished, setFilterPublished] = useState<string>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showFilters, setShowFilters] = useState(!subjectId);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Lesson | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [quizLessonId, setQuizLessonId] = useState<string | null>(null);

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
        show_on_home: false,
        home_order: 0,
        teaser_ar: '',
        teaser_en: '',
    });

    const { isTranslating: titleAutoTranslating } = useAutoTranslate(
        form.title_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, title_en: text })),
        dialogOpen
    );
    const { isTranslating: summaryAutoTranslating } = useAutoTranslate(
        form.summary_ar, 'ar', 'en',
        (text) => setForm(f => ({ ...f, summary_en: text })),
        dialogOpen
    );

    const fetchData = async () => {
        if (!mountedRef.current) return;
        setLoading(true);
        setError(null);

        try {
            const [stagesRes, subjectsRes] = await Promise.all([
                supabase.from('stages').select('id, title_ar, title_en, sort_order').order('sort_order'),
                supabase.from('subjects').select('id, title_ar, title_en, stage_id, sort_order').order('sort_order'),
            ]);

            if (mountedRef.current) {
                if (stagesRes.data) setAllStages(stagesRes.data as Stage[]);
                if (subjectsRes.data) setAllSubjects(subjectsRes.data as Subject[]);
            }

            let query = (supabase
                .from('lessons') as any)
                .select('*, subject:subjects(id, title_ar, title_en, stage_id, stage:stages(id, title_ar, title_en))')
                .order('order_index', { ascending: true });

            if (subjectId) {
                query = query.eq('subject_id', subjectId);
                const { data: subjectData } = await (supabase
                    .from('subjects') as any)
                    .select('*, stage:stages(*)')
                    .eq('id', subjectId)
                    .single();
                if (mountedRef.current && subjectData) {
                    setSubject(subjectData as Subject);
                }
            }

            const { data: lessonsData, error: lessonsError } = await query;

            if (!mountedRef.current) return;

            if (lessonsError) {
                devLog('Lessons fetch error', lessonsError);
                setError(lessonsError.message);
                toast.error(t('فشل في تحميل الدروس', 'Failed to load lessons'));
                setLessons([]);
            } else {
                setLessons((lessonsData as LessonWithJoins[]) || []);
                devLog(`Loaded ${lessonsData?.length || 0} lessons`);
            }
        } catch (err) {
            if (mountedRef.current) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                setError(message);
                toast.error(t('حدث خطأ', 'An error occurred'));
                setLessons([]);
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchData();
        return () => { mountedRef.current = false; };
    }, [subjectId]);

    const filteredLessons = lessons.filter(lesson => {
        if (filterStage !== 'all' && lesson.subject?.stage_id !== filterStage) return false;
        if (filterSubject !== 'all' && lesson.subject_id !== filterSubject) return false;
        if (filterPublished === 'published' && !lesson.is_published) return false;
        if (filterPublished === 'draft' && lesson.is_published) return false;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchTitle = lesson.title_ar?.toLowerCase().includes(q) || lesson.title_en?.toLowerCase().includes(q);
            const matchSubject = lesson.subject?.title_ar?.toLowerCase().includes(q);
            if (!matchTitle && !matchSubject) return false;
        }
        return true;
    });

    const filteredSubjectOptions = filterStage !== 'all'
        ? allSubjects.filter(s => s.stage_id === filterStage)
        : allSubjects;

    const handleAdd = () => {
        setEditingLesson(null);
        setForm({
            subject_id: subjectId || '',
            title_ar: '', title_en: '', slug: '', video_url: '',
            summary_ar: '', summary_en: '',
            order_index: lessons.length + 1,
            is_published: false, is_paid: true,
            show_on_home: false, home_order: 0,
            teaser_ar: '', teaser_en: '',
        });
        setDialogOpen(true);
    };

    const handleEdit = (lesson: LessonWithJoins) => {
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
            is_published: lesson.is_published ?? false,
            is_paid: lesson.is_paid,
            show_on_home: lesson.show_on_home || false,
            home_order: lesson.home_order || 0,
            teaser_ar: lesson.teaser_ar || '',
            teaser_en: lesson.teaser_en || '',
        });
        setDialogOpen(true);
    };

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
                const result = await verifiedUpdate('lessons', editingLesson.id, {
                    subject_id: targetSubjectId,
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    full_video_url: form.video_url || null,
                    summary_ar: form.summary_ar || null,
                    summary_en: form.summary_en || null,
                    order_index: form.order_index,
                    is_published: form.is_published,
                    is_paid: form.is_paid,
                    show_on_home: form.show_on_home,
                    home_order: form.home_order,
                    teaser_ar: form.teaser_ar || null,
                    teaser_en: form.teaser_en || null,
                }, {
                    successMessage: { ar: 'تم تحديث الدرس بنجاح', en: 'Lesson updated' },
                    errorMessage: { ar: 'فشل في تحديث الدرس', en: 'Failed to update lesson' },
                });
                if (result.success) { setDialogOpen(false); fetchData(); }
            } else {
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');
                const result = await verifiedInsert('lessons', {
                    subject_id: targetSubjectId,
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    slug,
                    full_video_url: form.video_url || null,
                    summary_ar: form.summary_ar || null,
                    summary_en: form.summary_en || null,
                    order_index: form.order_index,
                    is_published: form.is_published,
                    is_paid: form.is_paid,
                    show_on_home: form.show_on_home,
                    home_order: form.home_order,
                    teaser_ar: form.teaser_ar || null,
                    teaser_en: form.teaser_en || null,
                }, {
                    successMessage: { ar: 'تمت إضافة الدرس', en: 'Lesson added' },
                    errorMessage: { ar: 'فشل في إضافة الدرس', en: 'Failed to add lesson' },
                });
                if (result.success) {
                    setDialogOpen(false);
                    if (result.data) {
                        navigate(`/admin/lessons/${(result.data as Lesson).id}`);
                    } else { fetchData(); }
                }
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally { setSubmitting(false); }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            const result = await verifiedDelete('lessons', deleteTarget.id, {
                successMessage: { ar: 'تم حذف الدرس', en: 'Lesson deleted' },
                errorMessage: { ar: 'فشل في حذف الدرس', en: 'Failed to delete lesson' },
            });
            if (result.success) fetchData();
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally { setDeleteTarget(null); setSubmitting(false); }
    };

    const handleMoveUp = async (lesson: Lesson, index: number) => {
        if (index === 0) return;
        const prev = filteredLessons[index - 1];
        await verifiedUpdate('lessons', lesson.id, { order_index: prev.order_index }, { showErrorToast: false });
        await verifiedUpdate('lessons', prev.id, { order_index: lesson.order_index }, { showErrorToast: false });
        fetchData();
    };

    const handleMoveDown = async (lesson: Lesson, index: number) => {
        if (index === filteredLessons.length - 1) return;
        const next = filteredLessons[index + 1];
        await verifiedUpdate('lessons', lesson.id, { order_index: next.order_index }, { showErrorToast: false });
        await verifiedUpdate('lessons', next.id, { order_index: lesson.order_index }, { showErrorToast: false });
        fetchData();
    };

    const clearFilters = () => { setFilterStage('all'); setFilterSubject('all'); setFilterPublished('all'); setSearchQuery(''); };
    const hasActiveFilters = filterStage !== 'all' || filterSubject !== 'all' || filterPublished !== 'all' || searchQuery.trim().length > 0;

    // Quick toggle is_published
    const handleTogglePublished = async (lesson: Lesson, e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = !lesson.is_published;
        try {
            const result = await verifiedUpdate(
                'lessons',
                lesson.id,
                { is_published: newValue },
                {
                    successMessage: newValue
                        ? { ar: 'تم نشر الدرس', en: 'Lesson published' }
                        : { ar: 'تم إخفاء الدرس', en: 'Lesson unpublished' },
                    errorMessage: { ar: 'فشل التحديث', en: 'Update failed' },
                }
            );
            if (result.success) fetchData();
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        }
    };

    return (
        <div>
            {subjectId && subject && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                    <button onClick={() => navigate('/admin/stages')} className="hover:text-foreground transition-colors">
                        {t('المراحل', 'Stages')}
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <button onClick={() => navigate(subject?.stage_id ? `/admin/stages/${subject.stage_id}/subjects` : '/admin/subjects')} className="hover:text-foreground transition-colors">
                        {(subject as any)?.stage?.title_ar || t('المواد', 'Subjects')}
                    </button>
                    <ChevronRight className="w-4 h-4" />
                    <span className="text-foreground">{t(subject.title_ar, subject.title_en || subject.title_ar)}</span>
                </div>
            )}

            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">{t('إدارة الدروس', 'Manage Lessons')}</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {subjectId && subject
                            ? t(`دروس مادة: ${subject.title_ar}`, `Lessons for: ${subject.title_en || subject.title_ar}`)
                            : t(`${filteredLessons.length} درس`, `${filteredLessons.length} lessons`)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {!subjectId && (
                        <Button variant={showFilters ? 'secondary' : 'outline'} size="sm" onClick={() => setShowFilters(!showFilters)}>
                            <Filter className="w-4 h-4 me-2" />
                            {t('فلاتر', 'Filters')}
                            {hasActiveFilters && <Badge variant="destructive" className="ms-2 h-5 w-5 p-0 flex items-center justify-center text-[10px]">!</Badge>}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4" /></Button>
                    <Button onClick={handleAdd}><Plus className="w-4 h-4 me-2" />{t('إضافة درس', 'Add Lesson')}</Button>
                </div>
            </div>

            {!subjectId && showFilters && (
                <div className="bg-background rounded-lg border border-border p-4 mb-4 space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-medium text-foreground">{t('فلترة النتائج', 'Filter Results')}</h3>
                        {hasActiveFilters && (
                            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-xs">
                                <X className="w-3 h-3 me-1" />{t('مسح الكل', 'Clear All')}
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div className="relative">
                            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder={t('بحث بالعنوان...', 'Search by title...')} className="ps-9" />
                        </div>
                        <Select value={filterStage} onValueChange={(v) => { setFilterStage(v); setFilterSubject('all'); }}>
                            <SelectTrigger><SelectValue placeholder={t('كل المراحل', 'All Stages')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('كل المراحل', 'All Stages')}</SelectItem>
                                {allStages.map((s) => <SelectItem key={s.id} value={s.id}>{t(s.title_ar, s.title_en || s.title_ar)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterSubject} onValueChange={setFilterSubject}>
                            <SelectTrigger><SelectValue placeholder={t('كل المواد', 'All Subjects')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('كل المواد', 'All Subjects')}</SelectItem>
                                {filteredSubjectOptions.map((s) => <SelectItem key={s.id} value={s.id}>{t(s.title_ar, s.title_en || s.title_ar)}</SelectItem>)}
                            </SelectContent>
                        </Select>
                        <Select value={filterPublished} onValueChange={setFilterPublished}>
                            <SelectTrigger><SelectValue placeholder={t('كل الحالات', 'All Statuses')} /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                                <SelectItem value="published">{t('منشور', 'Published')}</SelectItem>
                                <SelectItem value="draft">{t('مسودة', 'Draft')}</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-destructive" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-destructive">{t('حدث خطأ', 'An error occurred')}</p>
                            <p className="text-xs text-destructive/80">{error}</p>
                        </div>
                        <Button variant="outline" size="sm" onClick={fetchData}><RefreshCw className="w-4 h-4 me-2" />{t('إعادة المحاولة', 'Retry')}</Button>
                    </div>
                </div>
            )}

            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
                ) : filteredLessons.length === 0 ? (
                    <div className="p-12 text-center">
                        <PlayCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {hasActiveFilters ? t('لا توجد نتائج', 'No results found') : t('لا توجد دروس', 'No lessons')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {hasActiveFilters ? t('حاول تغيير الفلاتر', 'Try changing the filters') : t('ابدأ بإضافة أول درس', 'Start by adding the first lesson')}
                        </p>
                        {hasActiveFilters
                            ? <Button variant="outline" onClick={clearFilters}>{t('مسح الفلاتر', 'Clear Filters')}</Button>
                            : <Button onClick={handleAdd}><Plus className="w-4 h-4 me-2" />{t('إضافة درس', 'Add Lesson')}</Button>}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>{t('عنوان الدرس', 'Lesson Title')}</TableHead>
                                {!subjectId && <TableHead>{t('المادة', 'Subject')}</TableHead>}
                                {!subjectId && <TableHead>{t('المرحلة', 'Stage')}</TableHead>}
                                <TableHead>{t('مدفوع', 'Paid')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead className="w-[200px]">{t('الإجراءات', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLessons.map((lesson, index) => (
                                <TableRow key={lesson.id}>
                                    <TableCell className="text-muted-foreground">{lesson.order_index}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-foreground">{lesson.title_ar}</p>
                                            {lesson.title_en && <p className="text-sm text-muted-foreground">{lesson.title_en}</p>}
                                            {lesson.summary_ar && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{lesson.summary_ar}</p>}
                                        </div>
                                    </TableCell>
                                    {!subjectId && <TableCell><span className="text-sm">{lesson.subject?.title_ar || '—'}</span></TableCell>}
                                    {!subjectId && <TableCell><span className="text-sm text-muted-foreground">{lesson.subject?.stage?.title_ar || '—'}</span></TableCell>}
                                    <TableCell>
                                        <Badge variant={lesson.is_paid ? 'default' : 'outline'} className={lesson.is_paid ? '' : 'text-green-600 border-green-200 bg-green-50'}>
                                            {lesson.is_paid ? t('مدفوع', 'Paid') : t('مجاني', 'Free')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                checked={lesson.is_published}
                                                onCheckedChange={() => { }}
                                                onClick={(e) => handleTogglePublished(lesson, e as any)}
                                                className="scale-75"
                                            />
                                            <span className={`text-xs font-medium ${lesson.is_published ? 'text-green-600' : 'text-amber-600'}`}>
                                                {lesson.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            {subjectId && (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleMoveUp(lesson, index)} disabled={index === 0}><ArrowUp className="w-4 h-4" /></Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleMoveDown(lesson, index)} disabled={index === filteredLessons.length - 1}><ArrowDown className="w-4 h-4" /></Button>
                                                </>
                                            )}
                                            <Button variant="ghost" size="icon" onClick={() => navigate(`/admin/lessons/${lesson.id}`)} title={t('محرر الدرس', 'Lesson Editor')}><Pencil className="w-4 h-4" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(lesson)} title={t('تعديل البيانات', 'Edit Details')}><BookOpen className="w-4 h-4 text-blue-600" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setQuizLessonId(lesson.id)} title={t('إدارة الاختبار', 'Manage Quiz')}><BrainCircuit className="w-4 h-4 text-purple-600" /></Button>
                                            <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(lesson)} className="text-destructive hover:text-destructive"><Trash2 className="w-4 h-4" /></Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingLesson ? t('تعديل الدرس', 'Edit Lesson') : t('إضافة درس جديد', 'Add New Lesson')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('المادة', 'Subject')} *</Label>
                            <Select value={form.subject_id} onValueChange={(value) => setForm({ ...form, subject_id: value })}>
                                <SelectTrigger><SelectValue placeholder={t('اختر مادة', 'Select Subject')} /></SelectTrigger>
                                <SelectContent>{allSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.title_ar}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="title_ar">{t('العنوان بالعربية', 'Arabic Title')} *</Label>
                                <Input id="title_ar" value={form.title_ar} onChange={(e) => setForm({ ...form, title_ar: e.target.value })} required />
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="title_en">{t('العنوان بالإنجليزية', 'English Title')}</Label>
                                    <TranslationButton sourceText={form.title_ar} sourceLang="ar" targetLang="en" onTranslated={(text) => setForm({ ...form, title_en: text })} label="Auto EN" autoTranslating={titleAutoTranslating} />
                                </div>
                                <Input id="title_en" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} />
                            </div>
                        </div>
                        {!editingLesson && (
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('المعرّف', 'Slug')}</Label>
                                <Input id="slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="lesson-title" />
                                <p className="text-xs text-muted-foreground">{t('سيتم إنشاؤه تلقائياً إذا تُرك فارغاً', 'Auto-generated if left empty')}</p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="video_url">{t('رابط الفيديو', 'Video URL')}</Label>
                            <Input id="video_url" value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://vimeo.com/..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="summary_ar">{t('ملخص بالعربية', 'Arabic Summary')}</Label>
                            <Textarea id="summary_ar" value={form.summary_ar} onChange={(e) => setForm({ ...form, summary_ar: e.target.value })} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="summary_en">{t('ملخص بالإنجليزية', 'English Summary')}</Label>
                                <TranslationButton sourceText={form.summary_ar} sourceLang="ar" targetLang="en" onTranslated={(text) => setForm({ ...form, summary_en: text })} label="Auto EN" autoTranslating={summaryAutoTranslating} />
                            </div>
                            <Textarea id="summary_en" value={form.summary_en} onChange={(e) => setForm({ ...form, summary_en: e.target.value })} rows={3} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="order_index">{t('الترتيب', 'Order')}</Label>
                            <Input id="order_index" type="number" value={form.order_index} onChange={(e) => setForm({ ...form, order_index: parseInt(e.target.value) || 0 })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_paid">{t('درس مدفوع', 'Paid Lesson')}</Label>
                            <Switch id="is_paid" checked={form.is_paid} onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_published">{t('منشور', 'Published')}</Label>
                            <Switch id="is_published" checked={form.is_published} onCheckedChange={(checked) => setForm({ ...form, is_published: checked })} />
                        </div>
                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-medium mb-3">{t('إعدادات الصفحة الرئيسية', 'Homepage Settings')}</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show_on_home">{t('عرض في الصفحة الرئيسية', 'Show on Home Page')}</Label>
                                    <Switch id="show_on_home" checked={form.show_on_home} onCheckedChange={(checked) => setForm({ ...form, show_on_home: checked })} />
                                </div>
                                {form.show_on_home && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="home_order">{t('ترتيب الظهور', 'Display Order')}</Label>
                                            <Input id="home_order" type="number" value={form.home_order} onChange={(e) => setForm({ ...form, home_order: parseInt(e.target.value) || 0 })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="teaser_ar">{t('نص ترويجي (عربي)', 'Teaser (Arabic)')}</Label>
                                            <Input id="teaser_ar" value={form.teaser_ar} onChange={(e) => setForm({ ...form, teaser_ar: e.target.value })} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="teaser_en">{t('نص ترويجي (إنجليزي)', 'Teaser (English)')}</Label>
                                            <Input id="teaser_en" value={form.teaser_en} onChange={(e) => setForm({ ...form, teaser_en: e.target.value })} />
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>{t('إلغاء', 'Cancel')}</Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>{submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حفظ', 'Save')}</Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {quizLessonId && <QuizEditor lessonId={quizLessonId} isOpen={!!quizLessonId} onClose={() => setQuizLessonId(null)} />}

            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('تأكيد الحذف', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {t(`هل أنت متأكد من حذف الدرس "${deleteTarget?.title_ar}"؟`, `Are you sure you want to delete "${deleteTarget?.title_en || deleteTarget?.title_ar}"?`)}
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
