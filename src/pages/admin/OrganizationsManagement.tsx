/**
 * OrganizationsManagement — Admin CRUD for organizations + members + subject assignments
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
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Loader2, Plus, Pencil, Trash2, Building2 } from 'lucide-react';
import { toast } from 'sonner';

export default function OrganizationsManagement() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();

    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingOrg, setEditingOrg] = useState<any>(null);
    const [deleteTarget, setDeleteTarget] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form, setForm] = useState({ name_ar: '', name_en: '', is_active: true });

    const { data: orgs = [], isLoading } = useQuery({
        queryKey: ['admin-organizations'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('organizations')
                .select('*, org_members(count), org_subjects(count)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const handleAdd = () => {
        setEditingOrg(null);
        setForm({ name_ar: '', name_en: '', is_active: true });
        setDialogOpen(true);
    };

    const handleEdit = (org: any) => {
        setEditingOrg(org);
        setForm({ name_ar: org.name_ar, name_en: org.name_en || '', is_active: org.is_active });
        setDialogOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.name_ar.trim()) { toast.error(t('أدخل اسم المؤسسة', 'Enter org name')); return; }
        setSubmitting(true);

        try {
            if (editingOrg) {
                const { error } = await (supabase.from('organizations') as any).update(form).eq('id', editingOrg.id);
                if (error) throw error;
                toast.success(t('تم تحديث المؤسسة', 'Organization updated'));
            } else {
                const { error } = await (supabase.from('organizations') as any).insert(form);
                if (error) throw error;
                toast.success(t('تمت إضافة المؤسسة', 'Organization added'));
            }
            setDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
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
            const { error } = await (supabase.from('organizations') as any).delete().eq('id', deleteTarget.id);
            if (error) throw error;
            toast.success(t('تم حذف المؤسسة', 'Organization deleted'));
            setDeleteTarget(null);
            queryClient.invalidateQueries({ queryKey: ['admin-organizations'] });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const getMemberCount = (org: any) => org.org_members?.[0]?.count || 0;
    const getSubjectCount = (org: any) => org.org_subjects?.[0]?.count || 0;

    if (isLoading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('إدارة المؤسسات', 'Organizations Management')}</h1>
                    <p className="text-muted-foreground mt-1">{t('إنشاء وإدارة المؤسسات التعليمية', 'Create and manage educational organizations')}</p>
                </div>
                <Button onClick={handleAdd}><Plus className="w-4 h-4 me-2" />{t('إضافة مؤسسة', 'Add Organization')}</Button>
            </div>

            {(orgs as any[]).length === 0 ? (
                <div className="bg-background rounded-xl border p-12 text-center">
                    <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium mb-2">{t('لا توجد مؤسسات', 'No organizations yet')}</h3>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('الاسم', 'Name')}</TableHead>
                            <TableHead>{t('الأعضاء', 'Members')}</TableHead>
                            <TableHead>{t('المواد', 'Subjects')}</TableHead>
                            <TableHead>{t('الحالة', 'Status')}</TableHead>
                            <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(orgs as any[]).map((org: any) => (
                            <TableRow key={org.id}>
                                <TableCell>
                                    <p className="font-medium">{org.name_ar}</p>
                                    {org.name_en && <p className="text-sm text-muted-foreground">{org.name_en}</p>}
                                </TableCell>
                                <TableCell>{getMemberCount(org)}</TableCell>
                                <TableCell>{getSubjectCount(org)}</TableCell>
                                <TableCell>
                                    <Badge variant={org.is_active ? 'default' : 'secondary'}>
                                        {org.is_active ? t('مفعّل', 'Active') : t('معطّل', 'Inactive')}
                                    </Badge>
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" onClick={() => handleEdit(org)}><Pencil className="w-4 h-4" /></Button>
                                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteTarget(org)}><Trash2 className="w-4 h-4" /></Button>
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
                        <DialogTitle>{editingOrg ? t('تعديل المؤسسة', 'Edit Organization') : t('إضافة مؤسسة', 'Add Organization')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSave} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('الاسم بالعربية', 'Arabic Name')} *</Label>
                            <Input value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('الاسم بالإنجليزية', 'English Name')}</Label>
                            <Input value={form.name_en} onChange={e => setForm({ ...form, name_en: e.target.value })} />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label>{t('مفعّل', 'Active')}</Label>
                            <Switch checked={form.is_active} onCheckedChange={c => setForm({ ...form, is_active: c })} />
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {editingOrg ? t('حفظ', 'Save') : t('إضافة', 'Add')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirm */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('حذف المؤسسة', 'Delete Organization')}</AlertDialogTitle>
                        <AlertDialogDescription>{t('هل أنت متأكد؟ سيتم حذف جميع الأعضاء والمواد المرتبطة.', 'Are you sure? All members and subject assignments will be removed.')}</AlertDialogDescription>
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
