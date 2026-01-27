import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Profile, TeacherInvite } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { UserPlus, Copy, Check, Loader2, MoreHorizontal, UserX, RefreshCw } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function TeachersManagement() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [teachers, setTeachers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<TeacherInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', email: '' });
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);

    const fetchData = async () => {
        setLoading(true);
        const [teachersRes, invitesRes] = await Promise.all([
            supabase.from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false }),
            supabase.from('teacher_invites').select('*').order('created_at', { ascending: false }),
        ]);

        setTeachers(teachersRes.data || []);
        setInvites(invitesRes.data || []);
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const { error } = await supabase.from('teacher_invites').insert({
            full_name: inviteForm.full_name,
            email: inviteForm.email,
            status: 'pending',
            invited_by: user?.id,
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        });

        if (!error) {
            setDialogOpen(false);
            setInviteForm({ full_name: '', email: '' });
            fetchData();
        }

        setSubmitting(false);
    };

    const copyInviteLink = (token: string) => {
        const link = `${window.location.origin}/invite/${token}`;
        navigator.clipboard.writeText(link);
        setCopied(token);
        setTimeout(() => setCopied(null), 2000);
    };

    const toggleTeacherStatus = async (teacher: Profile) => {
        await supabase.from('profiles').update({ is_active: !teacher.is_active }).eq('id', teacher.id);
        fetchData();
    };

    const resendInvite = async (invite: TeacherInvite) => {
        await supabase.from('teacher_invites').update({
            status: 'pending',
            expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        }).eq('id', invite.id);
        fetchData();
    };

    const deleteInvite = async (id: string) => {
        await supabase.from('teacher_invites').delete().eq('id', id);
        fetchData();
    };

    const statusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'secondary',
            accepted: 'default',
            expired: 'destructive',
        };
        const labels: Record<string, { ar: string; en: string }> = {
            pending: { ar: 'معلق', en: 'Pending' },
            accepted: { ar: 'مقبول', en: 'Accepted' },
            expired: { ar: 'منتهي', en: 'Expired' },
        };
        return (
            <Badge variant={variants[status] || 'outline'}>
                {t(labels[status]?.ar || status, labels[status]?.en || status)}
            </Badge>
        );
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إدارة المعلمين', 'Teachers Management')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('إضافة وإدارة حسابات المعلمين', 'Add and manage teacher accounts')}
                    </p>
                </div>

                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <UserPlus className="w-4 h-4 me-2" />
                            {t('دعوة معلم', 'Invite Teacher')}
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{t('دعوة معلم جديد', 'Invite New Teacher')}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleInvite} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="full_name">{t('الاسم الكامل', 'Full Name')}</Label>
                                <Input
                                    id="full_name"
                                    value={inviteForm.full_name}
                                    onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="email">{t('البريد الإلكتروني', 'Email')}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('إرسال الدعوة', 'Send Invite')}
                            </Button>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Pending Invites */}
            {invites.filter(i => i.status === 'pending').length > 0 && (
                <div className="mb-8">
                    <h2 className="text-lg font-medium text-foreground mb-3">
                        {t('الدعوات المعلقة', 'Pending Invites')}
                    </h2>
                    <div className="bg-background rounded-lg border border-border overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('الاسم', 'Name')}</TableHead>
                                    <TableHead>{t('البريد', 'Email')}</TableHead>
                                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                                    <TableHead>{t('انتهاء', 'Expires')}</TableHead>
                                    <TableHead className="w-[100px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invites.filter(i => i.status === 'pending').map((invite) => (
                                    <TableRow key={invite.id}>
                                        <TableCell className="font-medium">{invite.full_name}</TableCell>
                                        <TableCell>{invite.email}</TableCell>
                                        <TableCell>{statusBadge(invite.status)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(invite.expires_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => copyInviteLink(invite.token)}
                                                >
                                                    {copied === invite.token ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => resendInvite(invite)}>
                                                            <RefreshCw className="w-4 h-4 me-2" />
                                                            {t('تجديد الدعوة', 'Resend Invite')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => deleteInvite(invite.id)}
                                                            className="text-destructive"
                                                        >
                                                            <UserX className="w-4 h-4 me-2" />
                                                            {t('حذف', 'Delete')}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Teachers List */}
            <div>
                <h2 className="text-lg font-medium text-foreground mb-3">
                    {t('المعلمون', 'Teachers')}
                </h2>
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                        </div>
                    ) : teachers.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground">
                            {t('لا يوجد معلمون حتى الآن', 'No teachers yet')}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>{t('الاسم', 'Name')}</TableHead>
                                    <TableHead>{t('البريد', 'Email')}</TableHead>
                                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                                    <TableHead>{t('تاريخ الانضمام', 'Joined')}</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell className="font-medium">{teacher.full_name || '-'}</TableCell>
                                        <TableCell>{teacher.email}</TableCell>
                                        <TableCell>
                                            <Badge variant={teacher.is_active ? 'default' : 'secondary'}>
                                                {teacher.is_active ? t('نشط', 'Active') : t('معطل', 'Disabled')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {new Date(teacher.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => toggleTeacherStatus(teacher)}>
                                                        {teacher.is_active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </div>
            </div>
        </div>
    );
}
