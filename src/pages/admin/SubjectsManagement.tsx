import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { TranslationButton } from '@/components/admin/TranslationButton';
import type { Stage, Subject } from '@/types/database';
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Pencil, Trash2, ArrowRight, RefreshCw, AlertCircle, BookOpen, Beaker, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function SubjectsManagement() {
    const { t } = useLanguage();
    // Accept both stageId (new) and levelId (old) for backward compatibility
    const params = useParams<{ stageId?: string; levelId?: string }>();
    const stageId = params.stageId || params.levelId;
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    // State
    const [stage, setStage] = useState<Stage | null>(null);
    const [allStages, setAllStages] = useState<Stage[]>([]); // For dropdown
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Subject | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        stage_id: '', // New field for selection
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        slug: '',
        sort_order: 0,
        is_active: true,
        show_on_home: false,
        home_order: 0,
        teaser_ar: '',
        teaser_en: '',
    });

    // Fetch data
    const fetchData = async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            // Always fetch all stages for the dropdown if we need them (or we can fetch on demand)
            // It's small enough to fetch all.
            const { data: stagesData } = await supabase
                .from('stages')
                .select('*')
                .order('sort_order');

            if (mountedRef.current && stagesData) {
                setAllStages(stagesData);
            }

            if (!stageId) {
                // If no stage selected, we don't fetch subjects yet (or maybe all subjects? No, too many potentially).
                // Wait, user wants to create FROM here.
                setLoading(false);
                return;
            }

            // Fetch stage info
            const { data: stageData, error: stageError } = await supabase
                .from('stages')
                .select('*')
                .eq('id', stageId)
                .single();

            if (!mountedRef.current) return;

            if (stageError) {
                // ... validation error logic retained ...
                setError(stageError.message);
                setLoading(false);
                return;
            }

            setStage(stageData as Stage);

            // Fetch subjects for this stage
            const { data: subjectsData, error: subjectsError } = await supabase
                .from('subjects')
                .select('*')
                .eq('stage_id', stageId)
                .order('sort_order', { ascending: true });

            if (!mountedRef.current) return;

            if (subjectsError) {
                setError(subjectsError.message);
                toast.error('فشل في تحميل المواد', { description: subjectsError.message });
            } else {
                setSubjects((subjectsData as Subject[]) || []);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            if (mountedRef.current) {
                setError(message);
                toast.error('حدث خطأ', { description: message });
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchData();

        return () => {
            mountedRef.current = false;
        };
    }, [stageId]);

    const handleRetry = () => {
        fetchData();
    };

    // Open add dialog
    const handleAdd = () => {
        // ALLOW opening even if no stageId
        setEditingSubject(null);
        setForm({
            stage_id: stageId || '', // Pre-fill if known
            title_ar: '',
            title_en: '',
            description_ar: '',
            description_en: '',
            slug: '',
            sort_order: subjects.length + 1,
            is_active: true,
            show_on_home: false,
            home_order: 0,
            teaser_ar: '',
            teaser_en: '',
        });
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (subject: Subject) => {
        setEditingSubject(subject);
        setForm({
            stage_id: subject.stage_id || '', // Should ensure type has stage_id
            title_ar: subject.title_ar,
            title_en: subject.title_en || '',
            description_ar: subject.description_ar || '',
            description_en: subject.description_en || '',
            slug: subject.slug || '',
            sort_order: subject.sort_order,
            is_active: subject.is_active,
            show_on_home: subject.show_on_home || false,
            home_order: subject.home_order || 0,
            teaser_ar: subject.teaser_ar || '',
            teaser_en: subject.teaser_en || '',
        });
        setDialogOpen(true);
    };

    // Save (create or update) with verification
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        const targetStageId = form.stage_id || stageId;
        if (!targetStageId) {
            toast.error(t('الرجاء اختيار المرحلة', 'Please select a stage'));
            return;
        }

        if (!form.title_ar.trim()) {
            toast.error(t('الرجاء إدخال اسم المادة', 'Please enter subject name'));
            return;
        }

        setSubmitting(true);

        try {
            if (editingSubject) {
                // Update with verification
                const result = await verifiedUpdate(
                    'subjects',
                    editingSubject.id,
                    {
                        stage_id: targetStageId, // Allow moving to another stage if needed
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        description_ar: form.description_ar || null,
                        description_en: form.description_en || null,
                        sort_order: form.sort_order,
                        is_active: form.is_active,
                        show_on_home: form.show_on_home,
                        home_order: form.home_order,
                        teaser_ar: form.teaser_ar || null,
                        teaser_en: form.teaser_en || null,
                    },
                    {
                        successMessage: { ar: 'تم تحديث المادة بنجاح', en: 'Subject updated successfully' },
                        errorMessage: { ar: 'فشل في تحديث المادة', en: 'Failed to update subject' },
                    }
                );

                if (result.success) {
                    setDialogOpen(false);
                    fetchData(); // This only refreshes current view. If we added to another stage, it won't show.
                }
            } else {
                // Create with verification
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');

                const result = await verifiedInsert(
                    'subjects',
                    {
                        stage_id: targetStageId,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        description_ar: form.description_ar || null,
                        description_en: form.description_en || null,
                        slug,
                        sort_order: form.sort_order,
                        is_active: form.is_active,
                        show_on_home: form.show_on_home,
                        home_order: form.home_order,
                        teaser_ar: form.teaser_ar || null,
                        teaser_en: form.teaser_en || null,
                    },
                    {
                        successMessage: { ar: 'تمت إضافة المادة بنجاح', en: 'Subject added successfully' },
                        errorMessage: { ar: 'فشل في إضافة المادة', en: 'Failed to add subject' },
                    }
                );

                if (result.success) {
                    setDialogOpen(false);
                    if (!stageId) {
                        navigate(`/admin/stages/${targetStageId}/subjects`);
                    } else if (targetStageId === stageId) {
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
                'subjects',
                deleteTarget.id,
                {
                    successMessage: { ar: 'تم حذف المادة بنجاح', en: 'Subject deleted successfully' },
                    errorMessage: { ar: 'فشل في حذف المادة', en: 'Failed to delete subject' },
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

    // Navigate to lessons
    const handleSubjectClick = (subject: Subject) => {
        navigate(`/admin/subjects/${subject.id}/lessons`);
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
                <span className="text-foreground">
                    {stage ? t(stage.title_ar, stage.title_en || stage.title_ar) : '...'}
                </span>
            </div>

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('المواد الدراسية', 'Subjects')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {stage && t(`المواد في مرحلة ${stage.title_ar}`, `Subjects in ${stage.title_en || stage.title_ar}`)}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة مادة', 'Add Subject')}
                    </Button>
                </div>
            </div>

            {/* Empty State for no Stage ID */}
            {!stageId && (
                <div className="p-12 text-center rounded-lg border border-border bg-background mb-6">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('يرجى اختيار مرحلة لعرض المواد', 'Please select a stage to view subjects')}
                    </h3>
                    <Button variant="outline" onClick={() => navigate('/admin/stages')}>
                        {t('الذهاب للمراحل', 'Go to Stages')}
                    </Button>
                </div>
            )}

            {/* Error State */}
            {stageId && error && (
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
            {stageId && (
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : subjects.length === 0 ? (
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
                                    <TableHead className="w-[150px]">{t('الإجراءات', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {subjects.map((subject, index) => (
                                    <TableRow key={subject.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSubjectClick(subject)}>
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
                                            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
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
                                                <Button variant="ghost" size="icon" onClick={() => handleSubjectClick(subject)}>
                                                    <ArrowRight className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            )}

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
                        {!stageId && (
                            <div className="space-y-2">
                                <Label>{t('المرحلة الدراسية', 'Educational Stage')} *</Label>
                                <Select
                                    value={form.stage_id}
                                    onValueChange={(value) => setForm({ ...form, stage_id: value })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={t('اختر مرحلة', 'Select Stage')} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {allStages.map((s) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.title_ar}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

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
                            <div className="flex items-center justify-between">
                                <Label htmlFor="title_en">{t('الاسم بالإنجليزية', 'English Name')}</Label>
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
                                placeholder="Example: Mathematics"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description_ar">{t('الوصف بالعربية', 'Arabic Description')}</Label>
                            <Input
                                id="description_ar"
                                value={form.description_ar}
                                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                                placeholder={t('وصف المادة...', 'Subject description...')}
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="description_en">{t('الوصف بالإنجليزية', 'English Description')}</Label>
                                <TranslationButton
                                    sourceText={form.description_ar}
                                    sourceLang="ar"
                                    targetLang="en"
                                    onTranslated={(text) => setForm({ ...form, description_en: text })}
                                    label="Auto EN"
                                />
                            </div>
                            <Input
                                id="description_en"
                                value={form.description_en}
                                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                                placeholder="Subject description..."
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

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-medium mb-3">{t('إعدادات الصفحة الرئيسية', 'Homepage Settings')}</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show_on_home">{t('عرض في الصفحة الرئيسية', 'Show on Home Page')}</Label>
                                    <Switch
                                        id="show_on_home"
                                        checked={form.show_on_home}
                                        onCheckedChange={(checked) => setForm({ ...form, show_on_home: checked })}
                                    />
                                </div>

                                {form.show_on_home && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="home_order">{t('ترتيب الظهور', 'Display Order')}</Label>
                                            <Input
                                                id="home_order"
                                                type="number"
                                                value={form.home_order}
                                                onChange={(e) => setForm({ ...form, home_order: parseInt(e.target.value) || 0 })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="teaser_ar">{t('نص ترويجي (عربي)', 'Teaser Text (Arabic)')}</Label>
                                            <Input
                                                id="teaser_ar"
                                                value={form.teaser_ar}
                                                onChange={(e) => setForm({ ...form, teaser_ar: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="teaser_en">{t('نص ترويجي (إنجليزي)', 'Teaser Text (English)')}</Label>
                                            <Input
                                                id="teaser_en"
                                                value={form.teaser_en}
                                                onChange={(e) => setForm({ ...form, teaser_en: e.target.value })}
                                            />
                                        </div>
                                    </>
                                )}
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
                                `هل أنت متأكد من حذف المادة "${deleteTarget?.title_ar}"؟ سيتم حذف جميع الدروس المرتبطة بها.`,
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
