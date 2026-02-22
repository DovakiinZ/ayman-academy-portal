import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Lesson, Subject } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, Plus, Pencil, Trash2, FileText, Search, RefreshCw, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────────────────────

interface LessonWithSubject {
    id: string;
    title_ar: string;
    title_en?: string | null;
    subject_id?: string;
    is_published?: boolean;
    is_paid?: boolean;
    order_index?: number;
    created_at?: string;
    subject?: {
        id: string;
        title_ar: string;
        title_en?: string | null;
    } | null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function TeacherLessons() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const { courseId } = useParams<{ courseId: string }>();
    const navigate = useNavigate();

    const [lessons, setLessons] = useState<LessonWithSubject[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [courses, setCourses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create lesson dialog
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<LessonWithSubject | null>(null);
    const [form, setForm] = useState({
        course_id: courseId || '',
        subject_id: '',
        title_ar: '',
        title_en: '',
    });

    const fetchData = async () => {
        if (!user) return;
        setLoading(true);

        try {
            let lessonsQuery = supabase
                .from('lessons')
                .select('*, subject:subjects(id, title_ar, title_en)')
                .eq('created_by', user.id);

            if (courseId) {
                lessonsQuery = lessonsQuery.eq('course_id', courseId);
            }

            const [lessonsRes, subjectsRes, coursesRes] = await Promise.all([
                lessonsQuery.order('created_at', { ascending: false }),
                supabase
                    .from('subjects')
                    .select('id, title_ar, title_en')
                    .order('title_ar'),
                supabase
                    .from('courses')
                    .select('id, title_ar, title_en')
                    .eq('teacher_id', user.id)
            ]);

            setLessons((lessonsRes.data as LessonWithSubject[]) || []);
            setSubjects((subjectsRes.data as Subject[]) || []);
            setCourses(coursesRes.data || []);
        } catch (err) {
            toast.error(t('فشل في تحميل البيانات', 'Failed to load data'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        if (courseId) {
            setForm(prev => ({ ...prev, course_id: courseId }));
        }
    }, [user, courseId]);

    const filteredLessons = lessons.filter(lesson => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return lesson.title_ar?.toLowerCase().includes(q) ||
            lesson.title_en?.toLowerCase().includes(q) ||
            lesson.subject?.title_ar?.toLowerCase().includes(q);
    });

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.subject_id || !form.title_ar.trim()) {
            toast.error(t('يرجى ملء جميع الحقول المطلوبة', 'Please fill in all required fields'));
            return;
        }

        setSubmitting(true);
        try {
            const slug = form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');
            const { data, error } = await (supabase
                .from('lessons') as any)
                .insert({
                    course_id: form.course_id || null,
                    subject_id: form.subject_id || null,
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    slug,
                    created_by: user?.id,
                    order_index: lessons.length + 1,
                    is_paid: true,
                    is_published: false,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success(t('تم إنشاء الدرس', 'Lesson created'));
            setDialogOpen(false);
            setForm({ course_id: courseId || '', subject_id: '', title_ar: '', title_en: '' });

            // Navigate to block editor
            if (data) {
                navigate(`/teacher/lessons/${data.id}`);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('فشل في إنشاء الدرس', 'Failed to create lesson'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.from('lessons').delete().eq('id', deleteTarget.id);
            if (error) throw error;
            toast.success(t('تم حذف الدرس', 'Lesson deleted'));
            fetchData();
        } catch (err) {
            toast.error(t('فشل في حذف الدرس', 'Failed to delete lesson'));
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('دروسي', 'My Lessons')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t(`${filteredLessons.length} درس`, `${filteredLessons.length} lessons`)}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={fetchData}>
                        <RefreshCw className="w-4 h-4" />
                    </Button>
                    <Button onClick={() => { setForm({ course_id: courseId || '', subject_id: '', title_ar: '', title_en: '' }); setDialogOpen(true); }}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('درس جديد', 'New Lesson')}
                    </Button>
                </div>
            </div>

            {/* Search */}
            <div className="mb-4">
                <div className="relative max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={t('بحث بالعنوان...', 'Search by title...')}
                        className="ps-9"
                    />
                </div>
            </div>

            {/* Table */}
            <div className="bg-background rounded-lg border border-border overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : filteredLessons.length === 0 ? (
                    <div className="p-12 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {searchQuery ? t('لا توجد نتائج', 'No results found') : t('لا توجد دروس بعد', 'No lessons yet')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {searchQuery
                                ? t('حاول تغيير البحث', 'Try a different search')
                                : t('ابدأ بإنشاء أول درس لك', 'Start by creating your first lesson')
                            }
                        </p>
                        {!searchQuery && (
                            <Button onClick={() => setDialogOpen(true)}>
                                <Plus className="w-4 h-4 me-2" />
                                {t('درس جديد', 'New Lesson')}
                            </Button>
                        )}
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('عنوان الدرس', 'Lesson Title')}</TableHead>
                                <TableHead>{t('المادة', 'Subject')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead className="w-[120px]">{t('الإجراءات', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredLessons.map((lesson) => (
                                <TableRow key={lesson.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium">{lesson.title_ar}</p>
                                            {lesson.title_en && (
                                                <p className="text-sm text-muted-foreground">{lesson.title_en}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm">{lesson.subject?.title_ar || '—'}</span>
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
                                                onClick={() => navigate(`/teacher/lessons/${lesson.id}`)}
                                                title={t('تعديل المحتوى', 'Edit Content')}
                                            >
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget(lesson)}
                                                className="text-destructive hover:text-destructive"
                                                title={t('حذف', 'Delete')}
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

            {/* Create Lesson Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>{t('إنشاء درس جديد', 'Create New Lesson')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreate} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('الدورة (اختياري)', 'Course (Optional)')}</Label>
                            <Select value={form.course_id} onValueChange={(value) => setForm({ ...form, course_id: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('اختر دورة', 'Select Course')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{t(c.title_ar, c.title_en || c.title_ar)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('المادة', 'Subject')} *</Label>
                            <Select value={form.subject_id} onValueChange={(value) => setForm({ ...form, subject_id: value })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={t('اختر مادة', 'Select Subject')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {subjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.title_ar}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_title_ar">{t('عنوان الدرس (عربي)', 'Lesson Title (Arabic)')} *</Label>
                            <Input
                                id="new_title_ar"
                                value={form.title_ar}
                                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="new_title_en">{t('عنوان الدرس (إنجليزي)', 'Lesson Title (English)')}</Label>
                            <Input
                                id="new_title_en"
                                value={form.title_en}
                                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                            />
                        </div>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting || !form.subject_id || !form.title_ar.trim()}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('إنشاء وفتح المحرر', 'Create & Open Editor')}
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
