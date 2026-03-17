/**
 * PlansManagement — Admin CRUD for subscription plans
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useAutoTranslate } from '@/hooks/useAutoTranslate';
import { TranslationButton } from '@/components/admin/TranslationButton';

export default function PlansManagement() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const defaultForm = {
        name_ar: '', name_en: '', description_ar: '', description_en: '',
        billing: 'monthly', price_cents: 0, currency: 'SAR',
        is_family: false, max_members: 0, is_active: true, sort_order: 0,
    };
    const [form, setForm] = useState(defaultForm);

    // Auto-translate hooks
    const { isTranslating: nameTranslating } = useAutoTranslate(form.name_ar, 'ar', 'en', (text) => setForm(f => ({ ...f, name_en: text })), dialogOpen);
    const { isTranslating: descTranslating } = useAutoTranslate(form.description_ar, 'ar', 'en', (text) => setForm(f => ({ ...f, description_en: text })), dialogOpen);

    const { data: plans = [], isLoading } = useQuery({
        queryKey: ['admin-plans'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('plans')
                .select('*')
                .order('sort_order', { ascending: true });
            if (error) throw error;
            return data || [];
        },
    });

    const handleAdd = () => {
        setEditingPlan(null);
        setForm({ ...defaultForm, sort_order: plans.length + 1 });
        setDialogOpen(true);
    };

    const handleEdit = (plan: any) => {
        setEditingPlan(plan);
        setForm({
            name_ar: plan.name_ar, name_en: plan.name_en || '',
            description_ar: plan.description_ar || '', description_en: plan.description_en || '',
            billing: plan.billing, price_cents: plan.price_cents, currency: plan.currency,
            is_family: plan.is_family, max_members: plan.max_members || 0,
            is_active: plan.is_active, sort_order: plan.sort_order,
        });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name_ar.trim()) { toast.error(t('أدخل اسم الخطة', 'Enter plan name')); return; }
        setSubmitting(true);

        try {
            if (editingPlan) {
                const { error } = await (supabase.from as any)('plans').update(form).eq('id', editingPlan.id);
                if (error) throw error;
                toast.success(t('تم تحديث الخطة', 'Plan updated'));
            } else {
                const { error } = await (supabase.from as any)('plans').insert(form);
                if (error) throw error;
                toast.success(t('تمت إضافة الخطة', 'Plan added'));
            }
            setDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            const { error } = await (supabase.from as any)('plans').delete().eq('id', deleteTarget.id);
            if (error) throw error;
            toast.success(t('تم حذف الخطة', 'Plan deleted'));
            setDeleteTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const formatPrice = (cents: number, currency: string) => {
        return `${(cents / 100).toFixed(2)} ${currency}`;
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('إدارة الخطط', 'Plans Management')}</h1>
                    <p className="text-muted-foreground mt-1">{t('إنشاء وتعديل خطط الاشتراك', 'Create and manage subscription plans')}</p>
                </div>
                <Button onClick={handleAdd}><Plus className="w-4 h-4 me-2" />{t('إضافة خطة', 'Add Plan')}</Button>
            </div>

            {plans.length === 0 ? (
                <div className="bg-background rounded-xl border p-12 text-center">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium text-foreground mb-2">{t('لا توجد خطط', 'No plans yet')}</h3>
                    <p className="text-sm text-muted-foreground">{t('أضف خطة اشتراك جديدة', 'Add a new subscription plan')}</p>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>#</TableHead>
                            <TableHead>{t('الاسم', 'Name')}</TableHead>
                            <TableHead>{t('الفوترة', 'Billing')}</TableHead>
                            <TableHead>{t('السعر', 'Price')}</TableHead>
                            <TableHead>{t('عائلي', 'Family')}</TableHead>
                            <TableHead>{t('الحالة', 'Status')}</TableHead>
                            <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(plans as any[]).map((plan, i) => (
                            <TableRow key={plan.id}>
                                <TableCell>{plan.sort_order || i + 1}</TableCell>
                                <TableCell>
                                    <p className="font-medium">{plan.name_ar}</p>
                                    {plan.name_en && <p className="text-sm text-muted-foreground">{plan.name_en}</p>}
                                </TableCell>
                                <TableCell><Badge variant="outline">{plan.billing}</Badge></TableCell>
                                <TableCell>{formatPrice(plan.price_cents, plan.currency)}</TableCell>
                                <TableCell>{plan.is_family ? `✓ (${plan.max_members || '∞'})` : '—'}</TableCell>
                                <TableCell>
                                    <Badge variant={plan.is_active ? 'default' : 'secondary'}>
                                        {plan.is_active ? t('مفعّل', 'Active') : t('معطّل', 'Inactive')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(plan)}><Pencil className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(plan)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingPlan ? t('تعديل الخطة', 'Edit Plan') : t('إضافة خطة', 'Add Plan')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('الاسم بالعربية', 'Arabic Name')} *</Label>
                            <Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>{t('الاسم بالإنجليزية', 'English Name')}</Label>
                                <TranslationButton sourceText={form.name_ar} sourceLang="ar" targetLang="en"
                                    onTranslated={(text) => setForm(f => ({ ...f, name_en: text }))}
                                    autoTranslating={nameTranslating} />
                            </div>
                            <Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('الفوترة', 'Billing')}</Label>
                                <Select value={form.billing} onValueChange={v => setForm({ ...form, billing: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="monthly">{t('شهري', 'Monthly')}</SelectItem>
                                        <SelectItem value="yearly">{t('سنوي', 'Yearly')}</SelectItem>
                                        <SelectItem value="lifetime">{t('مدى الحياة', 'Lifetime')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('السعر (هللة)', 'Price (cents)')}</Label>
                                <Input type="number" value={form.price_cents} onChange={e => setForm({ ...form, price_cents: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('العملة', 'Currency')}</Label>
                                <Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('الترتيب', 'Sort Order')}</Label>
                                <Input type="number" value={form.sort_order} onChange={e => setForm({ ...form, sort_order: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t('خطة عائلية', 'Family Plan')}</Label>
                            <Switch checked={form.is_family} onCheckedChange={c => setForm({ ...form, is_family: c })} />
                        </div>
                        {form.is_family && (
                            <div className="space-y-2">
                                <Label>{t('الحد الأقصى للأعضاء', 'Max Members')}</Label>
                                <Input type="number" value={form.max_members} onChange={e => setForm({ ...form, max_members: parseInt(e.target.value) || 0 })} />
                            </div>
                        )}
                        <div className="flex items-center justify-between">
                            <Label>{t('مفعّل', 'Active')}</Label>
                            <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {editingPlan ? t('حفظ التعديلات', 'Save Changes') : t('إضافة', 'Add')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('حذف الخطة', 'Delete Plan')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('هل أنت متأكد؟ هذا الإجراء لا يمكن التراجع عنه.', 'Are you sure? This cannot be undone.')}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t('إلغاء', 'Cancel')}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {t('حذف', 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
