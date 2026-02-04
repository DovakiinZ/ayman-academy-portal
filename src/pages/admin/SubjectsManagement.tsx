import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { safeFetchSimple, clearCache } from '@/lib/safeFetch';
import { dummyLevels, getDummySubjectsForLevel } from '@/data/dummy';
import type { Level, Subject } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, ArrowRight, RefreshCw, AlertCircle, BookOpen, Beaker } from 'lucide-react';
import { toast } from 'sonner';

export default function SubjectsManagement() {
    const { t } = useLanguage();
    // Accept both stageId (new) and levelId (old) for backward compatibility
    const params = useParams<{ stageId?: string; levelId?: string }>();
    const levelId = params.stageId || params.levelId;
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    // State
    const [level, setLevel] = useState<Level | null>(null);
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        slug: '',
        sort_order: 0,
        is_active: true,
    });

    // Fetch data
    const fetchData = async () => {
        if (!levelId || !mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            // Fetch level info
            const { data: levelsData, source: levelsSource, error: levelsError } = await safeFetchSimple(
                () => supabase.from('levels').select('*').eq('id', levelId).single(),
                dummyLevels.find(l => l.id === levelId) || dummyLevels[0],
                `admin-level-${levelId}`
            );

            if (!mountedRef.current) return;

            if (levelsError && levelsSource !== 'dummy') {
                setError(levelsError);
                setLoading(false);
                return;
            }

            setLevel(levelsData);

            // Fetch subjects
            const { data: subjectsData, source: subjectsSource, error: subjectsError } = await safeFetchSimple(
                () => supabase.from('subjects').select('*').eq('level_id', levelId).order('sort_order'),
                getDummySubjectsForLevel(levelId),
                `admin-subjects-${levelId}`
            );

            if (!mountedRef.current) return;

            setIsDummy(levelsSource === 'dummy' || subjectsSource === 'dummy');
            setSubjects(subjectsData);

            if (subjectsError) {
                setError(subjectsError);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLevel(dummyLevels[0]);
            setSubjects(getDummySubjectsForLevel(levelId));
            setIsDummy(true);
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
    }, [levelId]);

    const handleRetry = () => {
        clearCache(`admin-level-${levelId}`);
        clearCache(`admin-subjects-${levelId}`);
        fetchData();
    };

    // Open add dialog
    const handleAdd = () => {
        setEditingSubject(null);
        setForm({
            title_ar: '',
            title_en: '',
            slug: '',
            sort_order: subjects.length + 1,
            is_active: true,
        });
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setForm({
            title_ar: subject.title_ar,
            title_en: subject.title_en || '',
            slug: subject.slug,
            sort_order: subject.sort_order,
            is_active: subject.is_active,
        });
        setDialogOpen(true);
    };

    // Save (create or update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!levelId) return;

        setSubmitting(true);

        try {
            if (editingSubject) {
                // Update
                const { error } = await supabase.from('subjects').update({
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    sort_order: form.sort_order,
                    is_active: form.is_active,
                }).eq('id', editingSubject.id);

                if (error) {
                    toast.error(t('فشل في تحديث المادة', 'Failed to update subject'), { description: error.message });
                } else {
                    toast.success(t('تم تحديث المادة بنجاح', 'Subject updated successfully'));
                    setDialogOpen(false);
                    clearCache(`admin-subjects-${levelId}`);
                    fetchData();
                }
            } else {
                // Create
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-');
                const { error } = await supabase.from('subjects').insert({
                    level_id: levelId,
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    slug,
                    sort_order: form.sort_order,
                    is_active: form.is_active,
                });

                if (error) {
                    toast.error(t('فشل في إضافة المادة', 'Failed to add subject'), { description: error.message });
                } else {
                    toast.success(t('تمت إضافة المادة بنجاح', 'Subject added successfully'));
                    setDialogOpen(false);
                    clearCache(`admin-subjects-${levelId}`);
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
            const { error } = await supabase.from('subjects').delete().eq('id', deleteTarget.id);

            if (error) {
                toast.error(t('فشل في حذف المادة', 'Failed to delete subject'), { description: error.message });
            } else {
                toast.success(t('تم حذف المادة بنجاح', 'Subject deleted successfully'));
                clearCache(`admin-subjects-${levelId}`);
                fetchData();
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
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
                <ArrowRight className="w-4 h-4" />
                <span className="text-foreground">
                    {level ? t(level.title_ar, level.title_en || level.title_ar) : '...'}
                </span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('المواد الدراسية', 'Subjects')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {level && t(`المواد في مرحلة ${level.title_ar}`, `Subjects in ${level.title_en || level.title_ar}`)}
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
                        {t('إضافة مادة', 'Add Subject')}
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
                ) : subjects.length === 0 && !isDummy ? (
                    <div className="p-12 text-center">
                        <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-foreground mb-2">
                            {t('لا توجد مواد', 'No subjects')}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t('ابدأ بإضافة أول مادة دراسية', 'Start by adding the first subject')}
                        </p>
                        <Button onClick={handleAdd}>
                            <Plus className="w-4 h-4 me-2" />
                            {t('إضافة مادة', 'Add Subject')}
                        </Button>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12">#</TableHead>
                                <TableHead>{t('اسم المادة', 'Subject Name')}</TableHead>
                                <TableHead>{t('المعرّف', 'Slug')}</TableHead>
                                <TableHead>{t('الحالة', 'Status')}</TableHead>
                                <TableHead className="w-[100px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {subjects.map((subject, index) => (
                                <TableRow key={subject.id}>
                                    <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell>
                                        <div>
                                            <p className="font-medium text-foreground">{subject.title_ar}</p>
                                            {subject.title_en && (
                                                <p className="text-sm text-muted-foreground">{subject.title_en}</p>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground font-mono">
                                        {subject.slug}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={subject.is_active ? 'default' : 'secondary'}>
                                            {subject.is_active ? t('مفعّل', 'Active') : t('معطّل', 'Inactive')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(subject)}>
                                                <Pencil className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteTarget(subject)}
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
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingSubject
                                ? t('تعديل المادة', 'Edit Subject')
                                : t('إضافة مادة جديدة', 'Add New Subject')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="title_ar">{t('الاسم بالعربية', 'Arabic Name')} *</Label>
                            <Input
                                id="title_ar"
                                value={form.title_ar}
                                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                placeholder={t('مثال: الرياضيات', 'Example: Mathematics')}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="title_en">{t('الاسم بالإنجليزية', 'English Name')}</Label>
                            <Input
                                id="title_en"
                                value={form.title_en}
                                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                                placeholder="Example: Mathematics"
                            />
                        </div>
                        {!editingSubject && (
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('المعرّف', 'Slug')}</Label>
                                <Input
                                    id="slug"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    placeholder="mathematics"
                                />
                                <p className="text-xs text-muted-foreground">
                                    {t('سيتم إنشاؤه تلقائياً إذا تُرك فارغاً', 'Will be auto-generated if left empty')}
                                </p>
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="sort_order">{t('الترتيب', 'Sort Order')}</Label>
                            <Input
                                id="sort_order"
                                type="number"
                                value={form.sort_order}
                                onChange={(e) => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_active">{t('مفعّل', 'Active')}</Label>
                            <Switch
                                id="is_active"
                                checked={form.is_active}
                                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
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
                                `هل أنت متأكد من حذف المادة "${deleteTarget?.title_ar}"؟`,
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
