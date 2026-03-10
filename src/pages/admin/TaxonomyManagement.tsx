import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { TranslationButton } from '@/components/admin/TranslationButton';
import type { Stage } from '@/types/database';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
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
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Loader2, Plus, MoreVertical, Pencil, Trash2, BookOpen, GraduationCap, RefreshCw, AlertCircle, Layers, Beaker } from 'lucide-react';
import { toast } from 'sonner';

interface StageWithSubjectCount extends Stage {
    subjectCount?: number;
}

export default function TaxonomyManagement() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    // Fetch stages with subject counts via useQuery
    const { data: stages = [], isLoading: loading, error: queryError, refetch } = useQuery({
        queryKey: ['admin', 'stages'],
        queryFn: async (): Promise<StageWithSubjectCount[]> => {
            devLog('Fetching stages...');
            const startTime = Date.now();

            const { data: stagesData, error: stagesError } = await supabase
                .from('stages')
                .select('*')
                .order('sort_order', { ascending: true });

            if (stagesError) {
                devLog('Stages fetch error', stagesError);
                toast.error('فشل في تحميل المراحل', { description: stagesError.message });
                throw new Error(stagesError.message);
            }

            if (!stagesData || stagesData.length === 0) {
                devLog('No stages found in database');
                return [];
            }

            // Add subject counts
            const stagesWithCounts: StageWithSubjectCount[] = [];
            for (const stage of stagesData as Stage[]) {
                const { count } = await supabase
                    .from('subjects')
                    .select('id', { count: 'exact', head: true })
                    .eq('stage_id', stage.id);

                stagesWithCounts.push({
                    ...stage,
                    subjectCount: count || 0,
                });
            }

            const duration = Date.now() - startTime;
            devLog(`Stages loaded in ${duration}ms`, { count: stagesWithCounts.length });
            return stagesWithCounts;
        },
        staleTime: 2 * 60 * 1000, // 2 minutes
    });

    const error = queryError ? (queryError instanceof Error ? queryError.message : 'Unknown error') : null;

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Stage | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        description_ar: '',
        description_en: '',
        slug: '',
        sort_order: 0,
        is_active: true,
    });

    const invalidateStages = () => {
        queryClient.invalidateQueries({ queryKey: ['admin', 'stages'] });
        queryClient.invalidateQueries({ queryKey: queryKeys.stages.all }); // also invalidate student cache
    };

    const handleRetry = () => {
        refetch();
    };

    // Open add dialog
    const handleAdd = () => {
        setEditingStage(null);
        setForm({
            title_ar: '',
            title_en: '',
            description_ar: '',
            description_en: '',
            slug: '',
            sort_order: stages.length + 1,
            is_active: true,
        });
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (stage: Stage) => {
        setEditingStage(stage);
        setForm({
            title_ar: stage.title_ar,
            title_en: stage.title_en || '',
            description_ar: stage.description_ar || '',
            description_en: stage.description_en || '',
            slug: stage.slug,
            sort_order: stage.sort_order,
            is_active: stage.is_active,
        });
        setDialogOpen(true);
    };

    // Save (create or update) with verification
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.title_ar.trim()) {
            toast.error(t('الرجاء إدخال اسم المرحلة', 'Please enter stage name'));
            return;
        }

        setSubmitting(true);

        try {
            if (editingStage) {
                // Update with verification
                const result = await verifiedUpdate(
                    'stages',
                    editingStage.id,
                    {
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        description_ar: form.description_ar || null,
                        description_en: form.description_en || null,
                        sort_order: form.sort_order,
                        is_active: form.is_active,
                    },
                    {
                        successMessage: { ar: 'تم تحديث المرحلة بنجاح', en: 'Stage updated successfully' },
                        errorMessage: { ar: 'فشل في تحديث المرحلة', en: 'Failed to update stage' },
                    }
                );

                if (result.success) {
                    setDialogOpen(false);
                    invalidateStages();
                }
                // Error toast is handled by verifiedUpdate
            } else {
                // Create with verification
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-').replace(/[^\w\u0621-\u064A-]/g, '');

                const result = await verifiedInsert(
                    'stages',
                    {
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        description_ar: form.description_ar || null,
                        description_en: form.description_en || null,
                        slug,
                        sort_order: form.sort_order,
                        is_active: form.is_active,
                    },
                    {
                        successMessage: { ar: 'تمت إضافة المرحلة بنجاح', en: 'Stage added successfully' },
                        errorMessage: { ar: 'فشل في إضافة المرحلة', en: 'Failed to add stage' },
                    }
                );

                if (result.success) {
                    setDialogOpen(false);
                    invalidateStages();
                }
                // Error toast is handled by verifiedInsert
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
                'stages',
                deleteTarget.id,
                {
                    successMessage: { ar: 'تم حذف المرحلة بنجاح', en: 'Stage deleted successfully' },
                    errorMessage: { ar: 'فشل في حذف المرحلة', en: 'Failed to delete stage' },
                }
            );

            if (result.success) {
                invalidateStages();
            }
            // Error toast is handled by verifiedDelete
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    // Navigate to subjects
    const handleStageClick = (stage: Stage) => {
        navigate(`/admin/stages/${stage.id}/subjects`);
    };

    // Quick toggle is_active
    const handleToggleActive = async (stage: StageWithSubjectCount, e: React.MouseEvent) => {
        e.stopPropagation();
        const newValue = !stage.is_active;
        try {
            const result = await verifiedUpdate(
                'stages',
                stage.id,
                { is_active: newValue },
                {
                    successMessage: newValue
                        ? { ar: 'تم تفعيل المرحلة', en: 'Stage activated' }
                        : { ar: 'تم إخفاء المرحلة', en: 'Stage hidden' },
                    errorMessage: { ar: 'فشل التحديث', en: 'Update failed' },
                }
            );
            if (result.success) invalidateStages();
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        }
    };

    // Stage icons with colors
    const stageIcons: Record<string, { icon: typeof GraduationCap; color: string }> = {
        'kindergarten': { icon: BookOpen, color: 'bg-pink-100 text-pink-600' },
        'primary': { icon: GraduationCap, color: 'bg-blue-100 text-blue-600' },
        'middle': { icon: Layers, color: 'bg-purple-100 text-purple-600' },
    };

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('المراحل الدراسية', 'Educational Stages')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('إدارة المراحل والمواد الدراسية', 'Manage stages and subjects')}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة مرحلة', 'Add Stage')}
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

            {/* Loading State */}
            {loading && (
                <div className="grid gap-4 md:grid-cols-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-background rounded-lg border border-border p-6 animate-pulse">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-lg bg-muted"></div>
                                <div className="flex-1">
                                    <div className="h-5 bg-muted rounded w-24 mb-2"></div>
                                    <div className="h-4 bg-muted rounded w-16"></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Stages Grid - always show data if available */}
            {!loading && stages.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    {stages.map((stage) => {
                        const iconConfig = stageIcons[stage.slug] || { icon: GraduationCap, color: 'bg-gray-100 text-gray-600' };
                        const Icon = iconConfig.icon;

                        return (
                            <div
                                key={stage.id}
                                className="bg-background rounded-lg border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative"
                                onClick={() => handleStageClick(stage)}
                            >
                                {/* Actions dropdown */}
                                <div className="absolute top-3 end-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreVertical className="w-4 h-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(stage); }}>
                                                <Pencil className="w-4 h-4 me-2" />
                                                {t('تعديل', 'Edit')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(stage); }}
                                                className="text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 me-2" />
                                                {t('حذف', 'Delete')}
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${iconConfig.color}`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground text-lg">
                                            {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {stage.subjectCount} {t('مواد', 'subjects')}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Switch
                                            checked={stage.is_active}
                                            onCheckedChange={() => { }}
                                            onClick={(e) => handleToggleActive(stage, e as any)}
                                            className="scale-75"
                                        />
                                        <span className={`text-xs font-medium ${stage.is_active ? 'text-green-600' : 'text-amber-600'}`}>
                                            {stage.is_active ? t('مفعّل', 'Active') : t('مخفي', 'Hidden')}
                                        </span>
                                    </div>
                                </div>

                                <div className="mt-4 text-xs text-primary font-medium group-hover:underline">
                                    {t('إدارة المواد ←', 'Manage subjects →')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State */}
            {!loading && stages.length === 0 && (
                <div className="bg-background rounded-lg border border-border p-12 text-center">
                    <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('لا توجد مراحل دراسية', 'No educational stages')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('ابدأ بإضافة أول مرحلة دراسية', 'Start by adding the first educational stage')}
                    </p>
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة مرحلة', 'Add Stage')}
                    </Button>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingStage
                                ? t('تعديل المرحلة', 'Edit Stage')
                                : t('إضافة مرحلة جديدة', 'Add New Stage')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="title_ar">{t('الاسم بالعربية', 'Arabic Name')} *</Label>
                            <Input
                                id="title_ar"
                                value={form.title_ar}
                                onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                                placeholder={t('مثال: ابتدائي', 'Example: Primary')}
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
                                placeholder="Example: Primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="description_ar">{t('الوصف بالعربية', 'Arabic Description')}</Label>
                            <Input
                                id="description_ar"
                                value={form.description_ar || ''}
                                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                                placeholder={t('وصف المرحلة...', 'Stage description...')}
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
                                value={form.description_en || ''}
                                onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                                placeholder="Stage description..."
                            />
                        </div>
                        {!editingStage && (
                            <div className="space-y-2">
                                <Label htmlFor="slug">{t('المعرّف', 'Slug')}</Label>
                                <Input
                                    id="slug"
                                    value={form.slug}
                                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
                                    placeholder="primary"
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
                                `هل أنت متأكد من حذف المرحلة "${deleteTarget?.title_ar}"؟ سيتم حذف جميع المواد المرتبطة بها.`,
                                `Are you sure you want to delete "${deleteTarget?.title_en || deleteTarget?.title_ar}"? All related subjects will be deleted.`
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
