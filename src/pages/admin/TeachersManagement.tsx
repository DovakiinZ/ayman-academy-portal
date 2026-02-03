import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { safeFetchSimple, clearCache } from '@/lib/safeFetch';
import { dummyTeachers, dummyTeacherInvites } from '@/data/dummy';
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
import { Badge } from '@/components/ui/badge';
import { UserPlus, Copy, Check, Loader2, MoreHorizontal, UserX, RefreshCw, AlertCircle, Trash2, Users, Beaker } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function TeachersManagement() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [teachers, setTeachers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<TeacherInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', email: '' });
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'teacher' | 'invite'; item: Profile | TeacherInvite } | null>(null);
    const mountedRef = useRef(true);

    const fetchData = async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            const [teachersRes, invitesRes] = await Promise.all([
                safeFetchSimple(
                    () => supabase.from('profiles').select('*').eq('role', 'teacher').order('created_at', { ascending: false }),
                    dummyTeachers as Profile[],
                    'admin-teachers'
                ),
                safeFetchSimple(
                    () => supabase.from('teacher_invites').select('*').order('created_at', { ascending: false }),
                    dummyTeacherInvites as TeacherInvite[],
                    'admin-invites'
                ),
            ]);

            if (!mountedRef.current) return;

            setIsDummy(teachersRes.source === 'dummy' || invitesRes.source === 'dummy');
            setTeachers(teachersRes.data);
            setInvites(invitesRes.data);

            // Show error only if both failed
            if (teachersRes.error && invitesRes.error) {
                setError(teachersRes.error);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            setError(err instanceof Error ? err.message : 'Unknown error');
            setTeachers(dummyTeachers as Profile[]);
            setInvites(dummyTeacherInvites as TeacherInvite[]);
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
        clearCache('admin-');
        fetchData();
    };

    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error(t('خطأ في المصادقة', 'Authentication error'));
            return;
        }

        setSubmitting(true);

        try {
            // Generate token
            const tokenHash = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const { data, error } = await supabase.from('teacher_invites').insert({
                full_name: inviteForm.full_name,
                email: inviteForm.email,
                token_hash: tokenHash,
                created_by: user.id,
                status: 'pending',
                expires_at: expiresAt,
            }).select().single();

            if (error) {
                toast.error(t('فشل في إرسال الدعوة', 'Failed to send invite'), { description: error.message });
            } else {
                toast.success(t('تم إرسال الدعوة بنجاح', 'Invite sent successfully'));
                setDialogOpen(false);
                setInviteForm({ full_name: '', email: '' });
                clearCache('admin-invites');
                fetchData();

                // Auto-copy invite link
                if (data?.token_hash) {
                    copyInviteLink(data.token_hash);
                }
            }
        } catch (err) {
            toast.error(t('فشل في إرسال الدعوة', 'Failed to send invite'));
        } finally {
            setSubmitting(false);
        }
    };

    const copyInviteLink = (tokenHash: string) => {
        const link = `${window.location.origin}/invite/${tokenHash}`;
        navigator.clipboard.writeText(link);
        setCopied(tokenHash);
        toast.success(t('تم نسخ رابط الدعوة', 'Invite link copied'));
        setTimeout(() => setCopied(null), 2000);
    };

    const handleToggleStatus = async (teacher: Profile) => {
        const { error } = await supabase
            .from('profiles')
            .update({ is_active: !teacher.is_active })
            .eq('id', teacher.id);

        if (error) {
            toast.error(t('فشل في تغيير الحالة', 'Failed to change status'), { description: error.message });
        } else {
            toast.success(
                teacher.is_active
                    ? t('تم تعطيل المعلم', 'Teacher disabled')
                    : t('تم تفعيل المعلم', 'Teacher enabled')
            );
            clearCache('admin-teachers');
            fetchData();
        }
    };

    const handleResendInvite = async (invite: TeacherInvite) => {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error } = await supabase
            .from('teacher_invites')
            .update({ expires_at: expiresAt })
            .eq('id', invite.id);

        if (error) {
            toast.error(t('فشل في تجديد الدعوة', 'Failed to resend invite'), { description: error.message });
        } else {
            toast.success(t('تم تجديد الدعوة بنجاح', 'Invite renewed successfully'));
            clearCache('admin-invites');
            fetchData();
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            if (deleteTarget.type === 'invite') {
                const invite = deleteTarget.item as TeacherInvite;
                const { error } = await supabase.from('teacher_invites').delete().eq('id', invite.id);

                if (error) {
                    toast.error(t('فشل في حذف الدعوة', 'Failed to delete invite'), { description: error.message });
                } else {
                    toast.success(t('تم حذف الدعوة', 'Invite deleted'));
                    clearCache('admin-invites');
                    fetchData();
                }
            } else {
                const teacher = deleteTarget.item as Profile;
                const { error } = await supabase.from('profiles').delete().eq('id', teacher.id);

                if (error) {
                    toast.error(t('فشل في حذف المعلم', 'Failed to delete teacher'), { description: error.message });
                } else {
                    toast.success(t('تم حذف المعلم', 'Teacher deleted'));
                    clearCache('admin-teachers');
                    fetchData();
                }
            }
        } catch (err) {
            toast.error(t('حدث خطأ', 'An error occurred'));
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    const statusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
            pending: 'secondary',
            accepted: 'default',
            expired: 'destructive',
            revoked: 'outline',
        };
        const labels: Record<string, { ar: string; en: string }> = {
            pending: { ar: 'معلق', en: 'Pending' },
            accepted: { ar: 'مقبول', en: 'Accepted' },
            expired: { ar: 'منتهي', en: 'Expired' },
            revoked: { ar: 'ملغى', en: 'Revoked' },
        };
        return (
            <Badge variant={variants[status] || 'outline'}>
                {t(labels[status]?.ar || status, labels[status]?.en || status)}
            </Badge>
        );
    };

    const pendingInvites = invites.filter(i => i.status === 'pending');

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

                <div className="flex items-center gap-3">
                    {isDummy && !loading && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-700">
                            <Beaker className="w-3.5 h-3.5" />
                            {t('بيانات تجريبية', 'Demo Data')}
                        </div>
                    )}
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

            {/* Pending Invites */}
            {pendingInvites.length > 0 && (
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
                                {pendingInvites.map((invite) => (
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
                                                    onClick={() => copyInviteLink(invite.token_hash)}
                                                >
                                                    {copied === invite.token_hash ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                                                </Button>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon">
                                                            <MoreHorizontal className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem onClick={() => handleResendInvite(invite)}>
                                                            <RefreshCw className="w-4 h-4 me-2" />
                                                            {t('تجديد الدعوة', 'Resend Invite')}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem
                                                            onClick={() => setDeleteTarget({ type: 'invite', item: invite })}
                                                            className="text-destructive"
                                                        >
                                                            <Trash2 className="w-4 h-4 me-2" />
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
                    ) : teachers.length === 0 && !isDummy ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {t('لا يوجد معلمون حتى الآن', 'No teachers yet')}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('ابدأ بدعوة أول معلم للأكاديمية', 'Start by inviting the first teacher')}
                            </p>
                            <Button onClick={() => setDialogOpen(true)}>
                                <UserPlus className="w-4 h-4 me-2" />
                                {t('دعوة معلم', 'Invite Teacher')}
                            </Button>
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
                                                    <DropdownMenuItem onClick={() => handleToggleStatus(teacher)}>
                                                        <UserX className="w-4 h-4 me-2" />
                                                        {teacher.is_active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteTarget({ type: 'teacher', item: teacher })}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4 me-2" />
                                                        {t('حذف', 'Delete')}
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

            {/* Delete Confirmation */}
            <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t('تأكيد الحذف', 'Confirm Delete')}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {deleteTarget?.type === 'invite'
                                ? t(
                                    `هل أنت متأكد من حذف دعوة "${(deleteTarget.item as TeacherInvite).full_name}"؟`,
                                    `Are you sure you want to delete the invite for "${(deleteTarget.item as TeacherInvite).full_name}"?`
                                )
                                : t(
                                    `هل أنت متأكد من حذف المعلم "${(deleteTarget?.item as Profile)?.full_name || (deleteTarget?.item as Profile)?.email}"؟`,
                                    `Are you sure you want to delete "${(deleteTarget?.item as Profile)?.full_name || (deleteTarget?.item as Profile)?.email}"?`
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
