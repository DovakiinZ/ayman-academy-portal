/**
 * InvitesManagement — Admin CRUD for subject invites
 */

import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Loader2, Plus, Mail, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function InvitesManagement() {
    const { t } = useLanguage();
    const { profile } = useAuth();
    const queryClient = useQueryClient();
    const [dialogOpen, setDialogOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({ student_id: '', subject_id: '' });

    const { data: invites = [], isLoading } = useQuery({
        queryKey: ['admin-invites'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subject_invites')
                .select('*, subject:subjects(title_ar), student:profiles!subject_invites_student_id_fkey(full_name)')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data || [];
        },
    });

    const { data: students = [] } = useQuery({
        queryKey: ['admin-student-list'],
        queryFn: async () => {
            const { data } = await supabase.from('profiles').select('id, full_name').eq('role', 'student').order('full_name');
            return data || [];
        },
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ['admin-invite-subjects'],
        queryFn: async () => {
            const { data } = await supabase.from('subjects').select('id, title_ar').eq('access_type', 'invite_only').eq('is_active', true);
            return data || [];
        },
    });

    const handleSendInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.student_id || !form.subject_id) { toast.error(t('أكمل جميع الحقول', 'Fill all fields')); return; }
        setSubmitting(true);
        try {
            const { error } = await (supabase.from('subject_invites') as any).insert({
                student_id: form.student_id,
                subject_id: form.subject_id,
                invited_by_user_id: profile?.id,
                status: 'active',
            });
            if (error) throw error;
            toast.success(t('تم إرسال الدعوة', 'Invite sent'));
            setDialogOpen(false);
            queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    const revokeInvite = async (id: string) => {
        const { error } = await (supabase.from('subject_invites') as any).update({ status: 'revoked' }).eq('id', id);
        if (error) { toast.error(error.message); return; }
        toast.success(t('تم إلغاء الدعوة', 'Invite revoked'));
        queryClient.invalidateQueries({ queryKey: ['admin-invites'] });
    };

    if (isLoading) {
        return <div className="flex items-center justify-center h-48"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">{t('إدارة الدعوات', 'Invites Management')}</h1>
                    <p className="text-muted-foreground mt-1">{t('إرسال وإدارة دعوات المواد', 'Send and manage subject invites')}</p>
                </div>
                <Button onClick={() => { setForm({ student_id: '', subject_id: '' }); setDialogOpen(true); }}>
                    <Plus className="w-4 h-4 me-2" />{t('إرسال دعوة', 'Send Invite')}
                </Button>
            </div>

            {(invites as any[]).length === 0 ? (
                <div className="bg-background rounded-xl border p-12 text-center">
                    <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                    <h3 className="font-medium mb-2">{t('لا توجد دعوات', 'No invites yet')}</h3>
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>{t('الطالب', 'Student')}</TableHead>
                            <TableHead>{t('المادة', 'Subject')}</TableHead>
                            <TableHead>{t('الحالة', 'Status')}</TableHead>
                            <TableHead>{t('التاريخ', 'Date')}</TableHead>
                            <TableHead>{t('إجراءات', 'Actions')}</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(invites as any[]).map((invite: any) => (
                            <TableRow key={invite.id}>
                                <TableCell>{invite.student?.full_name || '—'}</TableCell>
                                <TableCell>{invite.subject?.title_ar || '—'}</TableCell>
                                <TableCell>
                                    <Badge variant={invite.status === 'active' ? 'default' : 'secondary'}>{invite.status}</Badge>
                                </TableCell>
                                <TableCell className="text-sm">{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    {invite.status === 'active' && (
                                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => revokeInvite(invite.id)}>
                                            <XCircle className="w-4 h-4 me-1" />{t('إلغاء', 'Revoke')}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            )}

            {/* Send Invite Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('إرسال دعوة', 'Send Invite')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSendInvite} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>{t('الطالب', 'Student')} *</Label>
                            <Select value={form.student_id} onValueChange={v => setForm({ ...form, student_id: v })}>
                                <SelectTrigger><SelectValue placeholder={t('اختر طالب', 'Select student')} /></SelectTrigger>
                                <SelectContent>
                                    {(students as any[]).map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>{t('المادة (بدعوة فقط)', 'Subject (invite-only)')} *</Label>
                            <Select value={form.subject_id} onValueChange={v => setForm({ ...form, subject_id: v })}>
                                <SelectTrigger><SelectValue placeholder={t('اختر مادة', 'Select subject')} /></SelectTrigger>
                                <SelectContent>
                                    {(subjects as any[]).map((s: any) => (
                                        <SelectItem key={s.id} value={s.id}>{s.title_ar}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <Button type="submit" className="w-full" disabled={submitting}>
                            {submitting && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
                            {t('إرسال', 'Send')}
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
