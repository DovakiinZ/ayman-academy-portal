import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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

interface LevelWithSubjectCount extends Level {
    subjectCount?: number;
}

export default function TaxonomyManagement() {
    const { t } = useLanguage();
    const navigate = useNavigate();
    const mountedRef = useRef(true);

    // State
    const [levels, setLevels] = useState<LevelWithSubjectCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);

    // Modal states
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<Level | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<Level | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form state
    const [form, setForm] = useState({
        title_ar: '',
        title_en: '',
        slug: '',
        sort_order: 0,
        is_active: true,
    });

    // Fetch levels with subject counts
    const fetchData = async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            const { data: levelsData, source, error: levelsError } = await safeFetchSimple(
                () => supabase.from('levels').select('*').order('sort_order', { ascending: true }),
                dummyLevels,
                'admin-levels'
            );

            if (!mountedRef.current) return;

            if (levelsError) {
                setError(levelsError);
            }

            setIsDummy(source === 'dummy');

            // Add subject counts
            const levelsWithCounts: LevelWithSubjectCount[] = [];
            for (const level of levelsData) {
                if (source === 'dummy') {
                    // Use dummy subject counts
                    levelsWithCounts.push({
                        ...level,
                        subjectCount: getDummySubjectsForLevel(level.id).length,
                    });
                } else {
                    // Fetch real subject count
                    const { count } = await supabase
                        .from('subjects')
                        .select('id', { count: 'exact', head: true })
                        .eq('level_id', level.id);

                    levelsWithCounts.push({
                        ...level,
                        subjectCount: count || 0,
                    });
                }
            }

            if (mountedRef.current) {
                setLevels(levelsWithCounts);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setLevels(dummyLevels.map(l => ({ ...l, subjectCount: getDummySubjectsForLevel(l.id).length })));
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
    }, []);

    const handleRetry = () => {
        clearCache('admin-levels');
        fetchData();
    };

    // Open add dialog
    const handleAdd = () => {
        setEditingLevel(null);
        setForm({
            title_ar: '',
            title_en: '',
            slug: '',
            sort_order: levels.length + 1,
            is_active: true,
        });
        setDialogOpen(true);
    };

    // Open edit dialog
    const handleEdit = (level: Level) => {
        setEditingLevel(level);
        setForm({
            title_ar: level.title_ar,
            title_en: level.title_en || '',
            slug: level.slug,
            sort_order: level.sort_order,
            is_active: level.is_active,
        });
        setDialogOpen(true);
    };

    // Save (create or update)
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingLevel) {
                // Update
                const { error } = await supabase.from('levels').update({
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    sort_order: form.sort_order,
                    is_active: form.is_active,
                }).eq('id', editingLevel.id);

                if (error) {
                    toast.error(t('فشل في تحديث المرحلة', 'Failed to update level'), { description: error.message });
                } else {
                    toast.success(t('تم تحديث المرحلة بنجاح', 'Level updated successfully'));
                    setDialogOpen(false);
                    clearCache('admin-levels');
                    fetchData();
                }
            } else {
                // Create
                const slug = form.slug || form.title_ar.toLowerCase().replace(/\s+/g, '-');
                const { error } = await supabase.from('levels').insert({
                    title_ar: form.title_ar,
                    title_en: form.title_en || null,
                    slug,
                    sort_order: form.sort_order,
                    is_active: form.is_active,
                });

                if (error) {
                    toast.error(t('فشل في إضافة المرحلة', 'Failed to add level'), { description: error.message });
                } else {
                    toast.success(t('تمت إضافة المرحلة بنجاح', 'Level added successfully'));
                    setDialogOpen(false);
                    clearCache('admin-levels');
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
            const { error } = await supabase.from('levels').delete().eq('id', deleteTarget.id);

            if (error) {
                toast.error(t('فشل في حذف المرحلة', 'Failed to delete level'), { description: error.message });
            } else {
                toast.success(t('تم حذف المرحلة بنجاح', 'Level deleted successfully'));
                clearCache('admin-levels');
                fetchData();
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    // Navigate to subjects
    const handleLevelClick = (level: Level) => {
        navigate(`/admin/stages/${level.id}/subjects`);
    };

    // Level icons with colors
    const levelIcons: Record<string, { icon: typeof GraduationCap; color: string }> = {
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
                        {t('المراحل الدراسية', 'Stages')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('إدارة المراحل والمواد الدراسية', 'Manage stages and subjects')}
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
                        {t('إضافة مرحلة', 'Add Level')}
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

            {/* Levels Grid - always show data if available */}
            {!loading && levels.length > 0 && (
                <div className="grid gap-4 md:grid-cols-3">
                    {levels.map((level) => {
                        const iconConfig = levelIcons[level.slug] || { icon: GraduationCap, color: 'bg-gray-100 text-gray-600' };
                        const Icon = iconConfig.icon;

                        return (
                            <div
                                key={level.id}
                                className="bg-background rounded-lg border border-border p-6 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer group relative"
                                onClick={() => handleLevelClick(level)}
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
                                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEdit(level); }}>
                                                <Pencil className="w-4 h-4 me-2" />
                                                {t('تعديل', 'Edit')}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) => { e.stopPropagation(); setDeleteTarget(level); }}
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
                                            {t(level.title_ar, level.title_en || level.title_ar)}
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            {level.subjectCount} {t('مواد', 'subjects')}
                                        </p>
                                    </div>
                                </div>

                                {!level.is_active && (
                                    <div className="mt-3 text-xs text-amber-600 bg-amber-50 rounded px-2 py-1 inline-block">
                                        {t('غير مفعّل', 'Inactive')}
                                    </div>
                                )}

                                <div className="mt-4 text-xs text-primary font-medium group-hover:underline">
                                    {t('إدارة المواد ←', 'Manage subjects →')}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Empty State - only if not dummy and no data */}
            {!loading && !isDummy && levels.length === 0 && (
                <div className="bg-background rounded-lg border border-border p-12 text-center">
                    <Layers className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {t('لا توجد مراحل دراسية', 'No educational levels')}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                        {t('ابدأ بإضافة أول مرحلة دراسية', 'Start by adding the first educational level')}
                    </p>
                    <Button onClick={handleAdd}>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة مرحلة', 'Add Level')}
                    </Button>
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {editingLevel
                                ? t('تعديل المرحلة', 'Edit Level')
                                : t('إضافة مرحلة جديدة', 'Add New Level')}
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
                            <Label htmlFor="title_en">{t('الاسم بالإنجليزية', 'English Name')}</Label>
                            <Input
                                id="title_en"
                                value={form.title_en}
                                onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                                placeholder="Example: Primary"
                            />
                        </div>
                        {!editingLevel && (
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
