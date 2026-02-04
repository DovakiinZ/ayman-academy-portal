import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { safeFetchSimple, clearCache } from '@/lib/safeFetch';
import { dummyCourses, dummyLevels, dummyTeachers } from '@/data/dummy';
import type { Level, Subject, Profile, Course } from '@/types/database';
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
import { Loader2, Plus, Pencil, Trash2, List, RefreshCw, AlertCircle, BookOpen, Filter, Beaker } from 'lucide-react';
import { toast } from 'sonner';

interface CourseWithRelations extends Course {
    teacher?: Pick<Profile, 'id' | 'full_name' | 'email'>;
    level?: Pick<Level, 'id' | 'title_ar' | 'title_en'>;
}

export default function CoursesManagement() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    // Data
    const [courses, setCourses] = useState<CourseWithRelations[]>([]);
    const [levels, setLevels] = useState<Level[]>([]);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [teachers, setTeachers] = useState<Pick<Profile, 'id' | 'full_name' | 'email'>[]>([]);

    // State
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);
    const initialLoadDone = useRef(false);

    // Filters
    const [filterLevel, setFilterLevel] = useState<string>('');
    const [filterTeacher, setFilterTeacher] = useState<string>('');
    const [filterPublished, setFilterPublished] = useState<string>('');

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCourse, setEditingCourse] = useState<CourseWithRelations | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<CourseWithRelations | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        slug: '',
        description_ar: '',
        description_en: '',
        teacher_id: '',
        level_id: '',
        subject_id: '',
        is_published: false,
        is_paid: true,
        price_amount: 0,
    });

    // Fetch data
    const fetchData = useCallback(async () => {
        if (!mountedRef.current) return;

        // Dev diagnostics
        if (import.meta.env.DEV) {
            console.log('[CoursesManagement] fetch start');
        }

        // Only show loading spinner on initial load, not when navigating back
        if (!initialLoadDone.current) {
            setLoading(true);
        }
        setError(null);

        try {
            // Build query
            let query = supabase
                .from('courses')
                .select(`
                    *,
                    teacher:profiles!courses_teacher_id_fkey(id, full_name, email),
                    level:levels!courses_level_id_fkey(id, title_ar, title_en)
                `)
                .order('created_at', { ascending: false });

            if (filterLevel) query = query.eq('level_id', filterLevel);
            if (filterTeacher) query = query.eq('teacher_id', filterTeacher);
            if (filterPublished === 'true') query = query.eq('is_published', true);
            if (filterPublished === 'false') query = query.eq('is_published', false);

            const [coursesRes, levelsRes, teachersRes] = await Promise.all([
                safeFetchSimple(
                    () => query,
                    dummyCourses as CourseWithRelations[],
                    'admin-courses'
                ),
                safeFetchSimple(
                    () => supabase.from('levels').select('*').order('sort_order'),
                    dummyLevels,
                    'admin-levels'
                ),
                safeFetchSimple(
                    () => supabase.from('profiles').select('id, full_name, email').eq('role', 'teacher'),
                    dummyTeachers.map(t => ({ id: t.id!, full_name: t.full_name!, email: t.email! })),
                    'admin-teachers-select'
                ),
            ]);

            if (!mountedRef.current) return;

            setIsDummy(coursesRes.source === 'dummy');
            setCourses(coursesRes.data);
            setLevels(levelsRes.data);
            setTeachers(teachersRes.data);

            // Dev diagnostics
            if (import.meta.env.DEV) {
                console.log('[CoursesManagement] fetch success, courses:', coursesRes.data.length, 'source:', coursesRes.source);
            }

            if (coursesRes.error) {
                setError(coursesRes.error);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setCourses(dummyCourses as CourseWithRelations[]);
            setLevels(dummyLevels);
            setIsDummy(true);
        } finally {
            if (mountedRef.current) {
                setLoading(false);
                initialLoadDone.current = true;
            }
            // Dev diagnostics
            if (import.meta.env.DEV) {
                console.log('[CoursesManagement] fetch end (finally)');
            }
        }
    }, [filterLevel, filterTeacher, filterPublished]);

    // Fetch subjects when level changes in form
    const fetchSubjectsForLevel = async (levelId: string) => {
        const { data } = await supabase.from('subjects').select('*').eq('level_id', levelId);
        setSubjects(data || []);
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [fetchData]);

    const handleRetry = () => {
        clearCache('admin-courses');
        fetchData();
    };

    // Open add dialog
    const handleAdd = () => {
        setEditingCourse(null);
        setForm({
            title_ar: '',
            title_en: '',
            slug: '',
            description_ar: '',
            description_en: '',
            teacher_id: '',
            level_id: '',
            subject_id: '',
            is_published: false,
            is_paid: true,
            price_amount: 0,
        });
        setSubjects([]);
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (course: CourseWithRelations) => {
        setEditingCourse(course);
        setForm({
            title_ar: course.title_ar,
            title_en: course.title_en || '',
            slug: course.slug,
            description_ar: course.description_ar || '',
            description_en: course.description_en || '',
            teacher_id: course.teacher_id,
            level_id: course.level_id,
            subject_id: course.subject_id || '',
            is_published: course.is_published,
            is_paid: course.is_paid,
            price_amount: course.price_amount || 0,
        });
        if (course.level_id) {
            fetchSubjectsForLevel(course.level_id);
        }
        setDialogOpen(true);
    };

    // Save (create or update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingCourse) {
                // Update
                const { error } = await supabase.from('courses').update({
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    description_ar: form.description_ar || null,
                    description_en: form.description_en || null,
                    level_id: form.level_id,
                    subject_id: form.subject_id || null,
                    is_published: form.is_published,
                    is_paid: form.is_paid,
                    price_amount: form.is_paid ? form.price_amount : null,
                }).eq('id', editingCourse.id);

                if (error) {
                    toast.error(t('فشل في تحديث الدورة', 'Failed to update course'), { description: error.message });
                } else {
                    toast.success(t('تم تحديث الدورة بنجاح', 'Course updated successfully'));
                    setDialogOpen(false);
                    clearCache('admin-courses');
                    fetchData();
                }
            } else {
                // Create
                if (!form.teacher_id || !form.level_id) {
                    toast.error(t('يجب اختيار المعلم والمرحلة', 'Teacher and level are required'));
                    setSubmitting(false);
                    return;
                }

                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-');
                const { error } = await supabase.from('courses').insert({
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    slug,
                    description_ar: form.description_ar || null,
                    description_en: form.description_en || null,
                    teacher_id: form.teacher_id,
                    level_id: form.level_id,
                    subject_id: form.subject_id || null,
                    is_published: form.is_published,
                    is_paid: form.is_paid,
                    price_amount: form.is_paid ? form.price_amount : null,
                });

                if (error) {
                    toast.error(t('فشل في إنشاء الدورة', 'Failed to create course'), { description: error.message });
                } else {
                    toast.success(t('تم إنشاء الدورة بنجاح', 'Course created successfully'));
                    setDialogOpen(false);
                    clearCache('admin-courses');
                    fetchData();
                }
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setSubmitting(false);
        }
    };

    // Delete
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            const { error } = await supabase.from('courses').delete().eq('id', deleteTarget.id);

            if (error) {
                toast.error(t('فشل في حذف الدورة', 'Failed to delete course'), { description: error.message });
            } else {
                toast.success(t('تم حذف الدورة بنجاح', 'Course deleted successfully'));
                clearCache('admin-courses');
                fetchData();
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    // Navigate to lessons
    const handleManageLessons = (course: CourseWithRelations) => {
        navigate(`/admin/courses/${course.id}/lessons`);
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة الدورات', 'Courses Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('عرض وإدارة جميع الدورات في الأكاديمية', 'View and manage all courses in the academy')}
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
                        {t('إضافة دورة', 'Add Course')}
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-background rounded-lg border border-border p-4 mb-6">
                <div className="flex items-center gap-2 mb-3">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm font-medium text-foreground">{t('فلترة', 'Filters')}</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Select value={filterLevel} onValueChange={setFilterLevel}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('جميع المراحل', 'All levels')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t('جميع المراحل', 'All levels')}</SelectItem>
                            {levels.map(level => (
                                <SelectItem key={level.id} value={level.id}>
                                    {t(level.title_ar, level.title_en || level.title_ar)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterTeacher} onValueChange={setFilterTeacher}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('جميع المعلمين', 'All teachers')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t('جميع المعلمين', 'All teachers')}</SelectItem>
                            {teachers.map(teacher => (
                                <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.full_name || teacher.email}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterPublished} onValueChange={setFilterPublished}>
                        <SelectTrigger>
                            <SelectValue placeholder={t('الكل', 'All')} />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">{t('الكل', 'All')}</SelectItem>
                            <SelectItem value="true">{t('منشور', 'Published')}</SelectItem>
                            <SelectItem value="false">{t('مسودة', 'Draft')}</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button variant="outline" onClick={() => {
                        setFilterLevel('');
                        setFilterTeacher('');
                        setFilterPublished('');
                    }}>
                        <RefreshCw className="w-4 h-4 me-2" />
                        {t('إعادة تعيين', 'Reset')}
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
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                    </div>
                ) : courses.length === 0 && !isDummy ? (
                    <div className="p-12 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {t('لا توجد دورات', 'No courses')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('ابدأ بإضافة أول دورة', 'Start by adding the first course')}
                        </p>
                        <Button onClick={handleAdd}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('إضافة دورة', 'Add Course')}
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('عنوان الدورة', 'Course Title')}</TableHead>
                                <TableHead>{t('المعلم', 'Teacher')}</TableHead>
                                <TableHead>{t('المرحلة', 'Level')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead>{t('النوع', 'Type')}</TableHead>
                                <TableHead>{t('تاريخ الإنشاء', 'Created')}</TableHead>
                                <TableHead className="w-[120px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {courses.map((course) => (
                                <TableRow key={course.id}>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-foreground">{course.title_ar}</p>
                                            {course.title_en && (
                                                <p className="text-sm text-muted-foreground">{course.title_en}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {course.teacher?.full_name || course.teacher?.email || '-'}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {course.level?.title_ar || '-'}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={course.is_published ? 'default' : 'secondary'}>
                                            {course.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline">
                                            {course.is_paid ? t('مدفوع', 'Paid') : t('مجاني', 'Free')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {new Date(course.created_at).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => handleManageLessons(course)}
                                                title={t('إدارة الدروس', 'Manage lessons')}
                                            >
                                                <List className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(course)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget(course)}
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
                            {editingCourse
                                ? t('تعديل الدورة', 'Edit Course')
                                : t('إضافة دورة جديدة', 'Add New Course')}
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

                        {!editingCourse && (
                            <div className="space-y-2">
                                <Label htmlFor="teacher_id">{t('المعلم', 'Teacher')} *</Label>
                                <Select value={form.teacher_id} onValueChange={(val) => setForm({ ...form, teacher_id: val })}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر المعلم', 'Select teacher')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {teachers.map(teacher => (
                                            <SelectItem key={teacher.id} value={teacher.id}>
                                                {teacher.full_name || teacher.email}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="level_id">{t('المرحلة', 'Level')} *</Label>
                                <Select
                                    value={form.level_id}
                                    onValueChange={(val) => {
                                        setForm({ ...form, level_id: val, subject_id: '' });
                                        fetchSubjectsForLevel(val);
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر المرحلة', 'Select level')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {levels.map(level => (
                                            <SelectItem key={level.id} value={level.id}>
                                                {t(level.title_ar, level.title_en || level.title_ar)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="subject_id">{t('المادة', 'Subject')}</Label>
                                <Select
                                    value={form.subject_id}
                                    onValueChange={(val) => setForm({ ...form, subject_id: val })}
                                    disabled={!form.level_id}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر المادة', 'Select subject')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {subjects.map(subject => (
                                            <SelectItem key={subject.id} value={subject.id}>
                                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description_ar">{t('الوصف بالعربية', 'Arabic Description')}</Label>
                            <Textarea
                                id="description_ar"
                                value={form.description_ar}
                                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_published">{t('منشور', 'Published')}</Label>
                                <Switch
                                    id="is_published"
                                    checked={form.is_published}
                                    onCheckedChange={(checked) => setForm({ ...form, is_published: checked })}
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label htmlFor="is_paid">{t('مدفوع', 'Paid')}</Label>
                                <Switch
                                    id="is_paid"
                                    checked={form.is_paid}
                                    onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })}
                                />
                            </div>
                        </div>

                        {form.is_paid && (
                            <div className="space-y-2">
                                <Label htmlFor="price_amount">{t('السعر (ريال)', 'Price (SAR)')}</Label>
                                <Input
                                    id="price_amount"
                                    type="number"
                                    value={form.price_amount}
                                    onChange={(e) => setForm({ ...form, price_amount: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        )}

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
                                `هل أنت متأكد من حذف الدورة "${deleteTarget?.title_ar}"؟ سيتم حذف جميع الدروس المرتبطة بها.`,
                                `Are you sure you want to delete "${deleteTarget?.title_en || deleteTarget?.title_ar}"? All related lessons will be deleted.`
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
