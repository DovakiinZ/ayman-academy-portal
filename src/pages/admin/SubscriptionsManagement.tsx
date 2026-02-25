/**
 * SubscriptionsManagement — Admin view of all subscriptions
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Loader2, CreditCard, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const STATUS_COLORS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    active: 'default',
    trialing: 'outline',
    past_due: 'destructive',
    expired: 'secondary',
    cancelled: 'secondary',
};

export default function SubscriptionsManagement() {
    const { t } = useLanguage();
    const queryClient = useQueryClient();
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const { data: subscriptions = [], isLoading } = useQuery({
        queryKey: ['admin-subscriptions'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subscriptions')
                .select('*, plan:plans(name_ar, name_en), owner:profiles!subscriptions_owner_user_id_fkey(full_name), student:profiles!subscriptions_student_id_fkey(full_name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const filtered = filterStatus === 'all'
        ? subscriptions
        : (subscriptions as any[]).filter((s: any) => s.status === filterStatus);

    const updateStatus = async (id: string, status: string) => {
        const { error } = await (supabase.from('subscriptions') as any).update({ status }).eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success(t('تم تحديث الحالة', 'Status updated'));
        queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">{t('إدارة الاشتراكات', 'Subscriptions Management')}</h1>
                    <p className="text-muted-foreground mt-1">{t('عرض وإدارة اشتراكات الطلاب', 'View and manage student subscriptions')}</p>
                </div>
                <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-subscriptions'] })}>
                    <RefreshCw className="w-4 h-4 me-2" />{t('تحديث', 'Refresh')}
                </Button>
            </div>

            {/* Filter */}
            <div className="flex gap-4 items-center">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                        <SelectItem value="active">{t('نشط', 'Active')}</SelectItem>
                        <SelectItem value="trialing">{t('تجريبي', 'Trialing')}</SelectItem>
                        <SelectItem value="past_due">{t('متأخر', 'Past Due')}</SelectItem>
                        <SelectItem value="expired">{t('منتهي', 'Expired')}</SelectItem>
                        <SelectItem value="cancelled">{t('ملغي', 'Cancelled')}</SelectItem>
                    </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">{(filtered as any[]).length} {t('اشتراك', 'subscriptions')}</span>
            </div>

            {(filtered as any[]).length === 0 ? (
                <div className="bg-background rounded-xl border p-12 text-center">
                    <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium mb-2">{t('لا توجد اشتراكات', 'No subscriptions')}</h3>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('المالك', 'Owner')}</TableHead>
                            <TableHead>{t('الطالب', 'Student')}</TableHead>
                            <TableHead>{t('الخطة', 'Plan')}</TableHead>
                            <TableHead>{t('الحالة', 'Status')}</TableHead>
                            <TableHead>{t('ينتهي', 'Ends At')}</TableHead>
                            <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(filtered as any[]).map((sub: any) => (
                            <TableRow key={sub.id}>
                                <TableCell>{sub.owner?.full_name || '—'}</TableCell>
                                <TableCell>{sub.student?.full_name || t('نفسه', 'Self')}</TableCell>
                                <TableCell>{sub.plan?.name_ar || '—'}</TableCell>
                                <TableCell>
                                    <Badge variant={STATUS_COLORS[sub.status] || 'secondary'}>{sub.status}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">
                                    {sub.ends_at ? new Date(sub.ends_at).toLocaleDateString() : '—'}
                                </TableCell>
                                <TableCell>
                                    <Select value={sub.status} onValueChange={v => updateStatus(sub.id, v)}>
                                        <SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="active">{t('نشط', 'Active')}</SelectItem>
                                            <SelectItem value="expired">{t('منتهي', 'Expired')}</SelectItem>
                                            <SelectItem value="cancelled">{t('ملغي', 'Cancelled')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}
        </div>
    );
}
