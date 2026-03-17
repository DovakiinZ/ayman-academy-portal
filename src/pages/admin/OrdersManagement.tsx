/**
 * OrdersManagement — Admin view of all orders across the platform
 * Shows order details: student, teacher, subject, amount, status, dates
 */

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Badge } from '@/components/ui/badge';
import {
    Receipt, CheckCircle, XCircle, Clock, Loader2,
    User, BookOpen, CreditCard, Search, Download,
} from 'lucide-react';

type FilterStatus = 'all' | 'pending_payment' | 'paid' | 'rejected' | 'cancelled';

export default function OrdersManagement() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [filter, setFilter] = useState<FilterStatus>('all');
    const [search, setSearch] = useState('');

    const { data: orders, isLoading } = useQuery({
        queryKey: ['admin', 'orders'],
        queryFn: async () => {
            // Fetch all orders
            const { data, error } = await supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;

            const allOrders = data || [];

            // Batch fetch students, teachers, subjects
            const studentIds = [...new Set(allOrders.map(o => o.student_id))];
            const teacherIds = [...new Set(allOrders.map(o => o.teacher_id))];
            const subjectIds = [...new Set(allOrders.map(o => o.subject_id))];

            const [studentsRes, teachersRes, subjectsRes] = await Promise.all([
                studentIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', studentIds) : { data: [] },
                teacherIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', teacherIds) : { data: [] },
                subjectIds.length > 0 ? supabase.from('subjects').select('id, title_ar, title_en, price_amount, price_currency, stage:stages(title_ar, title_en)').in('id', subjectIds) : { data: [] },
            ]);

            const studentMap = new Map((studentsRes.data || []).map(s => [s.id, s]));
            const teacherMap = new Map((teachersRes.data || []).map(t => [t.id, t]));
            const subjectMap = new Map((subjectsRes.data || []).map(s => [s.id, s]));

            return allOrders.map(o => ({
                ...o,
                student: studentMap.get(o.student_id) || null,
                teacher: teacherMap.get(o.teacher_id) || null,
                subject: subjectMap.get(o.subject_id) || null,
            }));
        },
        enabled: !!user?.id,
        staleTime: 60 * 1000,
    });

    // Stats
    const stats = useMemo(() => {
        const all = orders || [];
        const paid = all.filter((o: any) => o.status === 'paid');
        const totalRevenue = paid.reduce((sum: number, o: any) => sum + (Number(o.amount) || 0), 0);
        return {
            total: all.length,
            pending: all.filter((o: any) => o.status === 'pending_payment').length,
            paid: paid.length,
            rejected: all.filter((o: any) => o.status === 'rejected').length,
            totalRevenue,
            currency: paid[0]?.currency || 'SYP',
        };
    }, [orders]);

    // Filtered + searched
    const filtered = useMemo(() => {
        let list = orders || [];
        if (filter !== 'all') list = list.filter((o: any) => o.status === filter);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter((o: any) =>
                o.student_full_name?.toLowerCase().includes(q) ||
                o.student_payment_account?.toLowerCase().includes(q) ||
                o.student?.full_name?.toLowerCase().includes(q) ||
                o.student?.email?.toLowerCase().includes(q) ||
                o.teacher?.full_name?.toLowerCase().includes(q) ||
                o.subject?.title_ar?.toLowerCase().includes(q) ||
                o.subject?.title_en?.toLowerCase().includes(q)
            );
        }
        return list;
    }, [orders, filter, search]);

    const statusConfig = (status: string) => {
        switch (status) {
            case 'pending_payment': return { label: t('بانتظار الدفع', 'Pending'), color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock };
            case 'paid': return { label: t('مدفوع', 'Paid'), color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle };
            case 'rejected': return { label: t('مرفوض', 'Rejected'), color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle };
            case 'cancelled': return { label: t('ملغي', 'Cancelled'), color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: XCircle };
            default: return { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock };
        }
    };

    const fmtDate = (d: string) => new Date(d).toLocaleDateString(language === 'ar' ? 'ar-SY' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const fmtAmount = (amount: number, currency?: string) => `${Number(amount).toLocaleString()} ${currency || 'SYP'}`;

    const filters: { key: FilterStatus; label: string; count: number }[] = [
        { key: 'all', label: t('الكل', 'All'), count: stats.total },
        { key: 'pending_payment', label: t('بانتظار الدفع', 'Pending'), count: stats.pending },
        { key: 'paid', label: t('مدفوع', 'Paid'), count: stats.paid },
        { key: 'rejected', label: t('مرفوض', 'Rejected'), count: stats.rejected },
    ];

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Receipt className="w-6 h-6 text-primary" />
                    {t('إدارة الطلبات', 'Orders Management')}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                    {t('جميع طلبات الشراء في المنصة', 'All purchase orders across the platform')}
                </p>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-background rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('إجمالي الطلبات', 'Total Orders')}</p>
                    <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('بانتظار الدفع', 'Pending')}</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('مدفوع', 'Paid')}</p>
                    <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
                </div>
                <div className="bg-background rounded-xl border border-border p-4">
                    <p className="text-xs text-muted-foreground mb-1">{t('إجمالي الإيرادات', 'Total Revenue')}</p>
                    <p className="text-2xl font-bold text-primary">{stats.totalRevenue.toLocaleString()} <span className="text-sm font-normal text-muted-foreground">{stats.currency}</span></p>
                </div>
            </div>

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                    <Search className="absolute top-1/2 -translate-y-1/2 start-3 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={t('بحث بالاسم أو البريد أو المادة...', 'Search by name, email, or subject...')}
                        className="w-full ps-9 pe-4 py-2 rounded-lg border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <div className="flex gap-1.5 overflow-x-auto">
                    {filters.map(f => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f.key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                        >
                            {f.label} ({f.count})
                        </button>
                    ))}
                </div>
            </div>

            {/* Loading */}
            {isLoading && (
                <div className="flex justify-center py-16">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Empty */}
            {!isLoading && filtered.length === 0 && (
                <div className="text-center py-16 bg-background rounded-xl border border-border">
                    <Receipt className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">{t('لا توجد طلبات', 'No orders found')}</p>
                </div>
            )}

            {/* Orders Table */}
            {!isLoading && filtered.length > 0 && (
                <div className="bg-background rounded-xl border border-border overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('الطالب', 'Student')}</th>
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('المادة', 'Subject')}</th>
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('المعلم', 'Teacher')}</th>
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('المبلغ', 'Amount')}</th>
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('شام كاش', 'Sham Cash')}</th>
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('الحالة', 'Status')}</th>
                                    <th className="text-start px-4 py-3 font-medium text-muted-foreground">{t('التاريخ', 'Date')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((order: any) => {
                                    const sc = statusConfig(order.status);
                                    const StatusIcon = sc.icon;
                                    return (
                                        <tr key={order.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                                            {/* Student */}
                                            <td className="px-4 py-3">
                                                <div className="min-w-[140px]">
                                                    <p className="font-medium truncate">{order.student_full_name || order.student?.full_name || '—'}</p>
                                                    <p className="text-xs text-muted-foreground truncate">{order.student?.email || ''}</p>
                                                </div>
                                            </td>
                                            {/* Subject */}
                                            <td className="px-4 py-3">
                                                <div className="min-w-[120px]">
                                                    <p className="truncate">{order.subject ? (language === 'ar' ? order.subject.title_ar : order.subject.title_en || order.subject.title_ar) : '—'}</p>
                                                    {order.subject?.stage && (
                                                        <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                                                            {language === 'ar' ? order.subject.stage.title_ar : order.subject.stage.title_en || order.subject.stage.title_ar}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            {/* Teacher */}
                                            <td className="px-4 py-3">
                                                <p className="truncate min-w-[100px]">{order.teacher?.full_name || '—'}</p>
                                            </td>
                                            {/* Amount */}
                                            <td className="px-4 py-3">
                                                <p className="font-semibold whitespace-nowrap">{fmtAmount(order.amount, order.currency)}</p>
                                            </td>
                                            {/* Sham Cash */}
                                            <td className="px-4 py-3">
                                                <div className="min-w-[100px]">
                                                    <p className="text-xs font-mono">{order.student_payment_account || '—'}</p>
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${sc.color}`}>
                                                    <StatusIcon className="w-3 h-3" />
                                                    {sc.label}
                                                </span>
                                            </td>
                                            {/* Date */}
                                            <td className="px-4 py-3">
                                                <p className="text-xs text-muted-foreground whitespace-nowrap">{fmtDate(order.created_at)}</p>
                                                {order.paid_at && (
                                                    <p className="text-[10px] text-green-600 whitespace-nowrap">{t('دُفع', 'Paid')}: {fmtDate(order.paid_at)}</p>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
