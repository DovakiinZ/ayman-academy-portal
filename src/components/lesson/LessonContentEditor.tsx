import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { LessonContentItem } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Switch } from '@/components/ui/switch';
import {
    Plus,
    Trash2,
    Pencil,
    GripVertical,
    Video,
    FileText,
    Image,
    File,
    Link as LinkIcon,
    Loader2,
    ArrowUp,
    ArrowDown,
} from 'lucide-react';
import { toast } from 'sonner';

type ContentType = 'video' | 'article' | 'image' | 'file' | 'link';

interface ContentItem extends Partial<LessonContentItem> {
    id: string;
    lesson_id: string;
    content_type: ContentType;
    title_ar: string;
    title_en?: string;
    content_url?: string;
    content_text?: string;
    is_paid: boolean;
    order_index: number;
}

interface LessonContentEditorProps {
    lessonId: string;
    items: ContentItem[];
    onItemsChange: (items: ContentItem[]) => void;
    readOnly?: boolean;
}

const contentTypeConfig: Record<ContentType, { icon: typeof Video; label: { ar: string; en: string }; color: string }> = {
    video: { icon: Video, label: { ar: 'فيديو', en: 'Video' }, color: 'text-blue-500' },
    article: { icon: FileText, label: { ar: 'مقال', en: 'Article' }, color: 'text-green-500' },
    image: { icon: Image, label: { ar: 'صورة', en: 'Image' }, color: 'text-purple-500' },
    file: { icon: File, label: { ar: 'ملف', en: 'File' }, color: 'text-orange-500' },
    link: { icon: LinkIcon, label: { ar: 'رابط', en: 'Link' }, color: 'text-cyan-500' },
};

export default function LessonContentEditor({
    lessonId,
    items,
    onItemsChange,
    readOnly = false,
}: LessonContentEditorProps) {
    const { t } = useLanguage();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<ContentItem | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<ContentItem | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({
        content_type: 'video' as ContentType,
        title_ar: '',
        title_en: '',
        content_url: '',
        content_text: '',
        is_paid: false,
    });

    const handleAdd = () => {
        setEditingItem(null);
        setForm({
            content_type: 'video',
            title_ar: '',
            title_en: '',
            content_url: '',
            content_text: '',
            is_paid: false,
        });
        setDialogOpen(true);
    };

    const handleEdit = (item: ContentItem) => {
        setEditingItem(item);
        setForm({
            content_type: item.content_type,
            title_ar: item.title_ar || '',
            title_en: item.title_en || '',
            content_url: item.content_url || '',
            content_text: item.content_text || '',
            is_paid: item.is_paid || false,
        });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            if (editingItem) {
                // Update existing item
                const { error } = await supabase
                    .from('lesson_content_items')
                    .update({
                        content_type: form.content_type,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        content_url: form.content_url || null,
                        content_text: form.content_text || null,
                        is_paid: form.is_paid,
                    })
                    .eq('id', editingItem.id);

                if (error) {
                    toast.error(t('فشل في تحديث المحتوى', 'Failed to update content'));
                } else {
                    toast.success(t('تم تحديث المحتوى', 'Content updated'));
                    // Update local state
                    const updated = items.map(item =>
                        item.id === editingItem.id
                            ? { ...item, ...form }
                            : item
                    );
                    onItemsChange(updated);
                    setDialogOpen(false);
                }
            } else {
                // Create new item
                const newOrderIndex = items.length > 0
                    ? Math.max(...items.map(i => i.order_index)) + 1
                    : 1;

                const { data, error } = await supabase
                    .from('lesson_content_items')
                    .insert({
                        lesson_id: lessonId,
                        content_type: form.content_type,
                        title_ar: form.title_ar,
                        title_en: form.title_en || null,
                        content_url: form.content_url || null,
                        content_text: form.content_text || null,
                        is_paid: form.is_paid,
                        order_index: newOrderIndex,
                    })
                    .select()
                    .single();

                if (error) {
                    toast.error(t('فشل في إضافة المحتوى', 'Failed to add content'));
                } else {
                    toast.success(t('تمت إضافة المحتوى', 'Content added'));
                    onItemsChange([...items, data as ContentItem]);
                    setDialogOpen(false);
                }
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            const { error } = await supabase
                .from('lesson_content_items')
                .delete()
                .eq('id', deleteTarget.id);

            if (error) {
                toast.error(t('فشل في حذف المحتوى', 'Failed to delete content'));
            } else {
                toast.success(t('تم حذف المحتوى', 'Content deleted'));
                onItemsChange(items.filter(item => item.id !== deleteTarget.id));
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    const handleMoveUp = async (item: ContentItem, index: number) => {
        if (index === 0) return;
        const prevItem = items[index - 1];

        // Swap order indexes
        await supabase.from('lesson_content_items').update({ order_index: prevItem.order_index }).eq('id', item.id);
        await supabase.from('lesson_content_items').update({ order_index: item.order_index }).eq('id', prevItem.id);

        const newItems = [...items];
        [newItems[index - 1], newItems[index]] = [newItems[index], newItems[index - 1]];
        onItemsChange(newItems);
    };

    const handleMoveDown = async (item: ContentItem, index: number) => {
        if (index === items.length - 1) return;
        const nextItem = items[index + 1];

        // Swap order indexes
        await supabase.from('lesson_content_items').update({ order_index: nextItem.order_index }).eq('id', item.id);
        await supabase.from('lesson_content_items').update({ order_index: item.order_index }).eq('id', nextItem.id);

        const newItems = [...items];
        [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
        onItemsChange(newItems);
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">
                    {t('محتويات الدرس', 'Lesson Content')}
                </h3>
                {!readOnly && (
                    <Button onClick={handleAdd} size="sm">
                        <Plus className="w-4 h-4 me-2" />
                        {t('إضافة محتوى', 'Add Content')}
                    </Button>
                )}
            </div>

            {/* Content Items List */}
            {items.length === 0 ? (
                <div className="border border-dashed border-border rounded-lg p-8 text-center">
                    <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                        {t('لا يوجد محتوى بعد', 'No content yet')}
                    </p>
                    {!readOnly && (
                        <Button variant="outline" size="sm" onClick={handleAdd} className="mt-3">
                            <Plus className="w-4 h-4 me-2" />
                            {t('إضافة أول محتوى', 'Add first content')}
                        </Button>
                    )}
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item, index) => {
                        const config = contentTypeConfig[item.content_type];
                        const Icon = config.icon;

                        return (
                            <div
                                key={item.id}
                                className="flex items-center gap-3 p-3 bg-background border border-border rounded-lg hover:border-primary/50 transition-colors group"
                            >
                                {!readOnly && (
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => handleMoveUp(item, index)}
                                            disabled={index === 0}
                                            className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                                        >
                                            <ArrowUp className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => handleMoveDown(item, index)}
                                            disabled={index === items.length - 1}
                                            className="p-1 hover:bg-secondary rounded disabled:opacity-30"
                                        >
                                            <ArrowDown className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                <div className={`w-8 h-8 rounded flex items-center justify-center bg-secondary ${config.color}`}>
                                    <Icon className="w-4 h-4" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-foreground truncate">
                                        {t(item.title_ar, item.title_en || item.title_ar)}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {t(config.label.ar, config.label.en)}
                                        {item.is_paid && (
                                            <span className="ms-2 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded text-[10px]">
                                                {t('مدفوع', 'Paid')}
                                            </span>
                                        )}
                                    </p>
                                </div>

                                {!readOnly && (
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}>
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-destructive hover:text-destructive"
                                            onClick={() => setDeleteTarget(item)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {editingItem
                                ? t('تعديل المحتوى', 'Edit Content')
                                : t('إضافة محتوى جديد', 'Add New Content')}
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('نوع المحتوى', 'Content Type')}</Label>
                            <Select
                                value={form.content_type}
                                onValueChange={(val: ContentType) => setForm({ ...form, content_type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(contentTypeConfig).map(([type, config]) => (
                                        <SelectItem key={type} value={type}>
                                            <div className="flex items-center gap-2">
                                                <config.icon className={`w-4 h-4 ${config.color}`} />
                                                {t(config.label.ar, config.label.en)}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

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

                        {(form.content_type === 'video' || form.content_type === 'image' || form.content_type === 'file' || form.content_type === 'link') && (
                            <div className="space-y-2">
                                <Label htmlFor="content_url">{t('الرابط', 'URL')}</Label>
                                <Input
                                    id="content_url"
                                    value={form.content_url}
                                    onChange={(e) => setForm({ ...form, content_url: e.target.value })}
                                    placeholder="https://..."
                                />
                            </div>
                        )}

                        {form.content_type === 'article' && (
                            <div className="space-y-2">
                                <Label htmlFor="content_text">{t('محتوى المقال', 'Article Content')}</Label>
                                <Textarea
                                    id="content_text"
                                    value={form.content_text}
                                    onChange={(e) => setForm({ ...form, content_text: e.target.value })}
                                    rows={6}
                                />
                            </div>
                        )}

                        <div className="flex items-center justify-between">
                            <Label htmlFor="is_paid">{t('محتوى مدفوع', 'Paid Content')}</Label>
                            <Switch
                                id="is_paid"
                                checked={form.is_paid}
                                onCheckedChange={(checked) => setForm({ ...form, is_paid: checked })}
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
                                `هل أنت متأكد من حذف "${deleteTarget?.title_ar}"؟`,
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
