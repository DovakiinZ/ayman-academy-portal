/**
 * CouponsManagement — Admin CRUD for discount coupons
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
import { Loader2, Plus, Pencil, Trash2, Ticket, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export default function CouponsManagement() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const defaultForm = {
        code: '', discount_type: 'percent', discount_value: 0,
        max_redemptions: 0, applies_to: 'plan', is_active: true,
    };
    const [form, setForm] = useState(defaultForm);

    const { data: coupons = [], isLoading } = useQuery({
        queryKey: ['admin-coupons'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('coupons')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const generateCode = () => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
        return code;
    };

    const handleAdd = () => {
        setEditingCoupon(null);
        setForm({ ...defaultForm, code: generateCode() });
        setDialogOpen(true);
    };

    const handleEdit = (coupon: any) => {
        setEditingCoupon(coupon);
        setForm({
            code: coupon.code, discount_type: coupon.discount_type,
            discount_value: coupon.discount_value, max_redemptions: coupon.max_redemptions || 0,
            applies_to: coupon.applies_to, is_active: coupon.is_active,
        });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.code.trim()) { toast.error(t('أدخل رمز الكوبون', 'Enter coupon code')); return; }
        setSubmitting(true);
        try {
            if (editingCoupon) {
                const { error } = await (supabase.from('coupons') as any).update(form).eq('id', editingCoupon.id);
                if (error) throw error;
                toast.success(t('تم تحديث الكوبون', 'Coupon updated'));
            } else {
                const { error } = await (supabase.from('coupons') as any).insert(form);
                if (error) throw error;
                toast.success(t('تمت إضافة الكوبون', 'Coupon added'));
            }
            setDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
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
            const { error } = await (supabase.from('coupons') as any).delete().eq('id', deleteTarget.id);
            if (error) throw error;
            toast.success(t('تم حذف الكوبون', 'Coupon deleted'));
            setDeleteTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin-coupons'] });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const copyCode = (code: string, id: string) => {
        navigator.clipboard.writeText(code);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('إدارة الكوبونات', 'Coupons Management')}</h1>
                    <p className="text-muted-foreground mt-1">{t('إنشاء وإدارة رموز الخصم', 'Create and manage discount codes')}</p>
                </div>
                <Button onClick={handleAdd}><Plus className="w-4 h-4 me-2" />{t('إضافة كوبون', 'Add Coupon')}</Button>
            </div>

            {(coupons as any[]).length === 0 ? (
                <div className="bg-background rounded-xl border p-12 text-center">
                    <Ticket className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium mb-2">{t('لا توجد كوبونات', 'No coupons yet')}</h3>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('الرمز', 'Code')}</TableHead>
                            <TableHead>{t('الخصم', 'Discount')}</TableHead>
                            <TableHead>{t('يطبق على', 'Applies To')}</TableHead>
                            <TableHead>{t('الاستخدام', 'Usage')}</TableHead>
                            <TableHead>{t('الحالة', 'Status')}</TableHead>
                            <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(coupons as any[]).map((coupon: any) => (
                            <TableRow key={coupon.id}>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <code className="bg-secondary px-2 py-1 rounded text-sm font-mono">{coupon.code}</code>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(coupon.code, coupon.id)}>
                                            {copiedId === coupon.id ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                                        </Button>
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {coupon.discount_type === 'percent'
                                        ? `${coupon.discount_value}%`
                                        : `${(coupon.discount_value / 100).toFixed(2)} SAR`}
                                </TableCell>
                                <TableCell><Badge variant="outline">{coupon.applies_to}</Badge></TableCell>
                                <TableCell>
                                    {coupon.redeemed_count}/{coupon.max_redemptions || '∞'}
                                </TableCell>
                                <TableCell>
                                    <Badge variant={coupon.is_active ? 'default' : 'secondary'}>
                                        {coupon.is_active ? t('مفعّل', 'Active') : t('معطّل', 'Inactive')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(coupon)}><Pencil className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(coupon)}><Trash2 className="w-4 h-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Add/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingCoupon ? t('تعديل الكوبون', 'Edit Coupon') : t('إضافة كوبون', 'Add Coupon')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('الرمز', 'Code')} *</Label>
                            <div className="flex gap-2">
                                <Input value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} className="font-mono" required />
                                <Button type="button" variant="outline" onClick={() => setForm({ ...form, code: generateCode() })}>
                                    {t('عشوائي', 'Random')}
                                </Button>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('نوع الخصم', 'Discount Type')}</Label>
                                <Select value={form.discount_type} onValueChange={v => setForm({ ...form, discount_type: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percent">{t('نسبة مئوية', 'Percent')}</SelectItem>
                                        <SelectItem value="fixed">{t('مبلغ ثابت', 'Fixed')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('القيمة', 'Value')}</Label>
                                <Input type="number" value={form.discount_value} onChange={e => setForm({ ...form, discount_value: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>{t('يطبق على', 'Applies To')}</Label>
                                <Select value={form.applies_to} onValueChange={v => setForm({ ...form, applies_to: v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="plan">{t('خطة', 'Plan')}</SelectItem>
                                        <SelectItem value="subject">{t('مادة', 'Subject')}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>{t('الحد الأقصى', 'Max Redemptions')}</Label>
                                <Input type="number" value={form.max_redemptions} onChange={e => setForm({ ...form, max_redemptions: parseInt(e.target.value) || 0 })} />
                                <p className="text-xs text-muted-foreground">{t('0 = بلا حد', '0 = unlimited')}</p>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t('مفعّل', 'Active')}</Label>
                            <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {editingCoupon ? t('حفظ', 'Save') : t('إضافة', 'Add')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('حذف الكوبون', 'Delete Coupon')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('هل أنت متأكد من حذف هذا الكوبون؟', 'Are you sure you want to delete this coupon?')}</AlertDialogDescription>
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
