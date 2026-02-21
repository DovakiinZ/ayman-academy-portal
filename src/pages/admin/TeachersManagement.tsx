import { useEffect, useState, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { verifiedInsert, verifiedUpdate, verifiedDelete, devLog } from '@/lib/adminDb';
import { uploadAvatar, getAvatarUrl } from '@/lib/storage';
import type { Profile, TeacherInvite, Stage } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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
import { UserPlus, Copy, Check, Loader2, MoreHorizontal, UserX, RefreshCw, AlertCircle, Trash2, Users, Beaker, Pencil, Home, PlusCircle } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export default function TeachersManagement() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const mountedRef = useRef(true);

    // Teachers & Invites state
    const [teachers, setTeachers] = useState<Profile[]>([]);
    const [invites, setInvites] = useState<TeacherInvite[]>([]);
    const [allStages, setAllStages] = useState<Stage[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Invite dialog state
    const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ full_name: '', email: '' });

    // Edit teacher dialog state
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editingTeacher, setEditingTeacher] = useState<Profile | null>(null);
    const [editForm, setEditForm] = useState({
        full_name: '',
        bio_ar: '',
        bio_en: '',
        show_on_home: false,
        home_order: 0,
        avatar_url: '',
        expertise_tags_ar: [] as string[],
        expertise_tags_en: [] as string[],
        featured_stages: [] as string[],
    });
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

    // Common UI state
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<{ type: 'teacher' | 'invite'; item: Profile | TeacherInvite } | null>(null);

    // Create teacher dialog state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [createForm, setCreateForm] = useState({
        full_name: '',
        email: '',
        bio_ar: '',
        bio_en: '',
        is_active: true,
        expertise_tags_ar: [] as string[],
        expertise_tags_en: [] as string[],
        avatar_url: '',
        featured_stages: [] as string[],
    });

    // --- Handlers ---
    const toggleStage = (stageId: string, formType: 'create' | 'edit') => {
        if (formType === 'create') {
            const current = createForm.featured_stages;
            const updated = current.includes(stageId)
                ? current.filter(id => id !== stageId)
                : [...current, stageId];
            setCreateForm({ ...createForm, featured_stages: updated });
        } else {
            const current = editForm.featured_stages;
            const updated = current.includes(stageId)
                ? current.filter(id => id !== stageId)
                : [...current, stageId];
            setEditForm({ ...editForm, featured_stages: updated });
        }
    };

    // Fetch data
    const fetchData = async () => {
        if (!mountedRef.current) return;

        setLoading(true);
        setError(null);
        const startTime = Date.now();
        devLog('Fetching teachers and invites...');

        try {
            const results = await Promise.all([
                supabase
                    .from('profiles')
                    .select('*')
                    .eq('role', 'teacher')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('teacher_invites')
                    .select('*')
                    .order('created_at', { ascending: false }),
                supabase
                    .from('stages')
                    .select('*')
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true }),
            ]) as [any, any, any];

            if (!mountedRef.current) return;

            const [teachersRes, invitesRes, stagesRes] = results;

            if (teachersRes.error) {
                devLog('Teachers fetch error', teachersRes.error);
                toast.error('فشل في تحميل المعلمين', { description: teachersRes.error.message });
            }
            if (invitesRes.error) {
                devLog('Invites fetch error', invitesRes.error);
                toast.error('فشل في تحميل الدعوات', { description: invitesRes.error.message });
            }
            if (stagesRes.error) {
                devLog('Stages fetch error', stagesRes.error);
            }

            setTeachers((teachersRes.data as Profile[]) || []);
            setInvites((invitesRes.data as TeacherInvite[]) || []);
            setAllStages((stagesRes.data as Stage[]) || []);

            const duration = Date.now() - startTime;
            devLog(`Data loaded in ${duration}ms`, {
                teachers: teachersRes.data?.length || 0,
                invites: invitesRes.data?.length || 0
            });
        } catch (err) {
            if (!mountedRef.current) return;
            const message = err instanceof Error ? err.message : 'Unknown error';
            devLog('Fetch exception', err);
            setError(message);
            toast.error('حدث خطأ', { description: message });
            setTeachers([]);
            setInvites([]);
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
        fetchData();
    };

    // --- Create Teacher (Manual) ---
    const handleCreateTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error(t('خطأ في المصادقة', 'Authentication error'));
            return;
        }

        if (!createForm.full_name.trim() || !createForm.email.trim()) {
            toast.error(t('الرجاء إدخال الاسم والبريد الإلكتروني', 'Please enter name and email'));
            return;
        }

        setSubmitting(true);
        devLog('Starting manual teacher creation...');

        try {
            // 1. Get admin client lazily
            const { getSupabaseAdmin } = await import('@/lib/supabaseAdmin');
            const supabaseAdmin = getSupabaseAdmin();

            if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
                throw new Error(t(
                    'مفتاح الخدمة (Service Role Key) مفقود. يرجى إضافته لملف .env',
                    'Service Role Key is missing. Please add it to your .env file.'
                ));
            }

            // 2. Create the auth user
            const tempPassword = `Teacher_${Math.random().toString(36).slice(-8)}!`;
            devLog('Creating auth user...');

            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email: createForm.email.trim(),
                password: tempPassword,
                email_confirm: true,
                user_metadata: { full_name: createForm.full_name.trim() }
            });

            if (authError) {
                devLog('Auth creation failed', authError);
                throw authError;
            }

            if (!authData.user) {
                throw new Error('No user data returned from auth creation');
            }

            devLog('Auth user created successfully', authData.user.id);

            // 3. Create the profile using the new user ID
            const result = await verifiedInsert(
                'profiles',
                {
                    id: authData.user.id,
                    full_name: createForm.full_name.trim(),
                    email: createForm.email.trim(),
                    bio_ar: createForm.bio_ar.trim() || null,
                    bio_en: createForm.bio_en.trim() || null,
                    expertise_tags_ar: createForm.expertise_tags_ar,
                    expertise_tags_en: createForm.expertise_tags_en,
                    avatar_url: createForm.avatar_url || null,
                    featured_stages: createForm.featured_stages,
                    role: 'teacher',
                    is_active: createForm.is_active,
                },
                {
                    successMessage: { ar: 'تم إنشاء حساب المعلم بنجاح', en: 'Teacher profile created successfully' },
                    errorMessage: { ar: 'فشل في إنشاء ملف المعلم الشخصي', en: 'Failed to create teacher profile' },
                }
            );

            if (result.success) {
                setCreateDialogOpen(false);
                setCreateForm({
                    full_name: '',
                    email: '',
                    bio_ar: '',
                    bio_en: '',
                    is_active: true,
                    expertise_tags_ar: [],
                    expertise_tags_en: [],
                    avatar_url: '',
                    featured_stages: []
                });
                fetchData();

                // Alert about password
                toast.success(t(
                    `كلمة السر المؤقتة: ${tempPassword}`,
                    `Temporary Password: ${tempPassword}`
                ), { duration: 10000 });
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            devLog('Create teacher exception', err);
            toast.error(t('فشل في إنشاء حساب المعلم', 'Failed to create teacher profile'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    // --- Invite Handling ---
    const handleInvite = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) {
            toast.error(t('خطأ في المصادقة', 'Authentication error'));
            return;
        }

        if (!inviteForm.full_name.trim() || !inviteForm.email.trim()) {
            toast.error(t('الرجاء ملء جميع الحقول', 'Please fill all fields'));
            return;
        }

        setSubmitting(true);

        try {
            const tokenHash = crypto.randomUUID();
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

            const result = await verifiedInsert(
                'teacher_invites',
                {
                    full_name: inviteForm.full_name,
                    email: inviteForm.email,
                    token_hash: tokenHash,
                    created_by: user.id,
                    status: 'pending',
                    expires_at: expiresAt,
                },
                {
                    successMessage: { ar: 'تم إرسال الدعوة بنجاح', en: 'Invite sent successfully' },
                    errorMessage: { ar: 'فشل في إرسال الدعوة', en: 'Failed to send invite' },
                }
            );

            if (result.success) {
                setInviteDialogOpen(false);
                setInviteForm({ full_name: '', email: '' });
                fetchData();
                // Auto-copy invite link
                copyInviteLink(tokenHash);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('فشل في إرسال الدعوة', 'Failed to send invite'), { description: message });
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

    const handleResendInvite = async (invite: TeacherInvite) => {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        const result = await verifiedUpdate(
            'teacher_invites',
            invite.id,
            { expires_at: expiresAt },
            {
                successMessage: { ar: 'تم تجديد الدعوة بنجاح', en: 'Invite renewed successfully' },
                errorMessage: { ar: 'فشل في تجديد الدعوة', en: 'Failed to resend invite' },
            }
        );

        if (result.success) {
            fetchData();
        }
    };

    // --- Teacher Editing ---
    const handleOpenEditDialog = (teacher: Profile) => {
        setEditingTeacher(teacher);
        setEditForm({
            full_name: teacher.full_name || '',
            bio_ar: teacher.bio_ar || '',
            bio_en: teacher.bio_en || '',
            show_on_home: teacher.show_on_home || false,
            home_order: teacher.home_order || 0,
            avatar_url: teacher.avatar_url || '',
            expertise_tags_ar: (teacher as any).expertise_tags_ar || [],
            expertise_tags_en: (teacher as any).expertise_tags_en || [],
            featured_stages: (teacher as any).featured_stages || [],
        });
        setAvatarPreview(getAvatarUrl(teacher.avatar_url));
        setAvatarFile(null);
        setEditDialogOpen(true);
    };

    const handleSaveTeacher = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingTeacher) return;

        if (!editForm.full_name.trim()) {
            toast.error(t('الرجاء إدخال الاسم', 'Please enter name'));
            return;
        }

        setSubmitting(true);

        try {
            let finalAvatarUrl = editForm.avatar_url;

            // Handle avatar upload if new file selected
            if (avatarFile) {
                const { url, error: uploadError } = await uploadAvatar(editingTeacher.id, avatarFile);
                if (uploadError) throw uploadError;
                if (url) finalAvatarUrl = url;
            }

            const result = await verifiedUpdate(
                'profiles',
                editingTeacher.id,
                {
                    full_name: editForm.full_name,
                    bio_ar: editForm.bio_ar || null,
                    bio_en: editForm.bio_en || null,
                    expertise_tags_ar: editForm.expertise_tags_ar,
                    expertise_tags_en: editForm.expertise_tags_en,
                    avatar_url: finalAvatarUrl || null,
                    featured_stages: editForm.featured_stages,
                    show_on_home: editForm.show_on_home,
                    home_order: editForm.home_order,
                },
                {
                    successMessage: { ar: 'تم تحديث بيانات المعلم', en: 'Teacher updated successfully' },
                    errorMessage: { ar: 'فشل في تحديث بيانات المعلم', en: 'Failed to update teacher' },
                }
            );

            if (result.success) {
                setEditDialogOpen(false);
                setEditingTeacher(null);
                setAvatarFile(null);
                fetchData();
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setSubmitting(false);
        }
    };

    // --- Status Toggle ---
    const handleToggleStatus = async (teacher: Profile) => {
        const result = await verifiedUpdate(
            'profiles',
            teacher.id,
            { is_active: !teacher.is_active },
            {
                successMessage: teacher.is_active
                    ? { ar: 'تم تعطيل المعلم', en: 'Teacher disabled' }
                    : { ar: 'تم تفعيل المعلم', en: 'Teacher enabled' },
                errorMessage: { ar: 'فشل في تغيير الحالة', en: 'Failed to change status' },
            }
        );

        if (result.success) {
            fetchData();
        }
    };

    // --- Deletion ---
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);

        try {
            if (deleteTarget.type === 'invite') {
                const invite = deleteTarget.item as TeacherInvite;
                const result = await verifiedDelete(
                    'teacher_invites',
                    invite.id,
                    {
                        successMessage: { ar: 'تم حذف الدعوة', en: 'Invite deleted' },
                        errorMessage: { ar: 'فشل في حذف الدعوة', en: 'Failed to delete invite' },
                    }
                );

                if (result.success) {
                    fetchData();
                }
            } else {
                const teacher = deleteTarget.item as Profile;
                // For teachers, we soft-delete by setting is_active = false and clearing role
                const result = await verifiedUpdate(
                    'profiles',
                    teacher.id,
                    { is_active: false, role: 'student' },
                    {
                        successMessage: { ar: 'تم إزالة المعلم', en: 'Teacher removed' },
                        errorMessage: { ar: 'فشل في حذف المعلم', en: 'Failed to delete teacher' },
                    }
                );

                if (result.success) {
                    fetchData();
                }
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error(t('حدث خطأ', 'An error occurred'), { description: message });
        } finally {
            setDeleteTarget(null);
            setSubmitting(false);
        }
    };

    // Helpers
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
            {/* Header */}
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
                    <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                        <PlusCircle className="w-4 h-4 me-2" />
                        {t('إنشاء معلم', 'Create Teacher')}
                    </Button>
                    <Button onClick={() => setInviteDialogOpen(true)}>
                        <UserPlus className="w-4 h-4 me-2" />
                        {t('دعوة معلم', 'Invite Teacher')}
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
                                    <TableHead className="w-[100px]">{t('الإجراءات', 'Actions')}</TableHead>
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
                                                        <DropdownMenuSeparator />
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
                    ) : teachers.length === 0 ? (
                        <div className="p-12 text-center">
                            <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-medium text-foreground mb-2">
                                {t('لا يوجد معلمون حتى الآن', 'No teachers yet')}
                            </h3>
                            <p className="text-sm text-muted-foreground mb-4">
                                {t('ابدأ بدعوة أول معلم للأكاديمية', 'Start by inviting the first teacher')}
                            </p>
                            <Button onClick={() => setInviteDialogOpen(true)}>
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
                                    <TableHead>{t('الصفحة الرئيسية', 'Home Page')}</TableHead>
                                    <TableHead>{t('الحالة', 'Status')}</TableHead>
                                    <TableHead>{t('تاريخ الانضمام', 'Joined')}</TableHead>
                                    <TableHead className="w-[100px]">{t('الإجراءات', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teachers.map((teacher) => (
                                    <TableRow key={teacher.id}>
                                        <TableCell>
                                            <div>
                                                <p className="font-medium">{teacher.full_name || '-'}</p>
                                                {teacher.bio_ar && (
                                                    <p className="text-xs text-muted-foreground line-clamp-1">{teacher.bio_ar}</p>
                                                )}
                                                {(teacher as any).expertise_tags_ar?.length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1">
                                                        {(teacher as any).expertise_tags_ar.map((tag: string, i: number) => (
                                                            <Badge key={i} variant="outline" className="text-[10px] py-0 px-1">
                                                                {tag}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{teacher.email}</TableCell>
                                        <TableCell>
                                            {teacher.show_on_home ? (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                                                    <Home className="w-3 h-3 me-1" />
                                                    {teacher.home_order || 0}
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground text-sm">-</span>
                                            )}
                                        </TableCell>
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
                                                    <DropdownMenuItem onClick={() => handleOpenEditDialog(teacher)}>
                                                        <Pencil className="w-4 h-4 me-2" />
                                                        {t('تعديل', 'Edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleToggleStatus(teacher)}>
                                                        <UserX className="w-4 h-4 me-2" />
                                                        {teacher.is_active ? t('تعطيل', 'Disable') : t('تفعيل', 'Enable')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        onClick={() => setDeleteTarget({ type: 'teacher', item: teacher })}
                                                        className="text-destructive"
                                                    >
                                                        <Trash2 className="w-4 h-4 me-2" />
                                                        {t('إزالة', 'Remove')}
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

            {/* Invite Teacher Dialog */}
            <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t('دعوة معلم جديد', 'Invite New Teacher')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleInvite} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="invite_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                            <Input
                                id="invite_name"
                                value={inviteForm.full_name}
                                onChange={(e) => setInviteForm({ ...inviteForm, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="invite_email">{t('البريد الإلكتروني', 'Email')} *</Label>
                            <Input
                                id="invite_email"
                                type="email"
                                value={inviteForm.email}
                                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setInviteDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('إرسال الدعوة', 'Send Invite')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Teacher Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('تعديل بيانات المعلم', 'Edit Teacher')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSaveTeacher} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                            <Input
                                id="edit_name"
                                value={editForm.full_name}
                                onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                                required
                            />
                        </div>

                        {/* Avatar Upload */}
                        <div className="space-y-2 pb-2">
                            <Label>{t('الصورة الشخصية', 'Profile Picture')}</Label>
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-secondary overflow-hidden flex items-center justify-center border border-border">
                                    {avatarPreview ? (
                                        <img src={avatarPreview} alt="Avatar Preview" className="w-full h-full object-cover" />
                                    ) : (
                                        <Users className="w-8 h-8 text-muted-foreground" />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <Input
                                        type="file"
                                        accept="image/*"
                                        className="text-xs"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                setAvatarFile(file);
                                                setAvatarPreview(URL.createObjectURL(file));
                                            }
                                        }}
                                    />
                                    <p className="text-[10px] text-muted-foreground mt-1">
                                        {t('يفضل استخدام صورة مربعة بحجم 400x400 بكسل', 'Prefer 400x400px square image')}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_bio_ar">{t('السيرة الذاتية بالعربية', 'Arabic Bio')}</Label>
                            <Textarea
                                id="edit_bio_ar"
                                value={editForm.bio_ar}
                                onChange={(e) => setEditForm({ ...editForm, bio_ar: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit_bio_en">{t('السيرة الذاتية بالإنجليزية', 'English Bio')}</Label>
                            <Textarea
                                id="edit_bio_en"
                                value={editForm.bio_en}
                                onChange={(e) => setEditForm({ ...editForm, bio_en: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_tags_ar">{t('التخصصات (بالعربية، مفصولة بفاصلة)', 'Expertise Tags (Arabic, comma separated)')}</Label>
                            <Input
                                id="edit_tags_ar"
                                value={editForm.expertise_tags_ar.join(', ')}
                                onChange={(e) => setEditForm({ ...editForm, expertise_tags_ar: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                placeholder="رياضيات، فيزياء، كيمياء"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit_tags_en">{t('التخصصات (بالإنجليزية، مفصولة بفاصلة)', 'Expertise Tags (English, comma separated)')}</Label>
                            <Input
                                id="edit_tags_en"
                                value={editForm.expertise_tags_en.join(', ')}
                                onChange={(e) => setEditForm({ ...editForm, expertise_tags_en: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                                placeholder="Math, Physics, Chemistry"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('المراحل الدراسية', 'Educational Stages')}</Label>
                            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                {allStages.map(stage => (
                                    <div key={stage.id} className="flex items-center space-x-2 space-x-reverse">
                                        <Switch
                                            id={`stage-edit-${stage.id}`}
                                            checked={editForm.featured_stages.includes(stage.id)}
                                            onCheckedChange={() => toggleStage(stage.id, 'edit')}
                                        />
                                        <Label htmlFor={`stage-edit-${stage.id}`} className="text-xs cursor-pointer">
                                            {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                        </Label>
                                    </div>
                                ))}
                                {allStages.length === 0 && (
                                    <p className="text-xs text-muted-foreground col-span-2">
                                        {t('لا توجد مراحل متاحة', 'No stages available')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="border-t pt-4 mt-4">
                            <h3 className="font-medium mb-3">{t('إعدادات الصفحة الرئيسية', 'Homepage Settings')}</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <Label htmlFor="show_on_home">{t('عرض في الصفحة الرئيسية', 'Show on Home Page')}</Label>
                                    <Switch
                                        id="show_on_home"
                                        checked={editForm.show_on_home}
                                        onCheckedChange={(checked) => setEditForm({ ...editForm, show_on_home: checked })}
                                    />
                                </div>
                                {editForm.show_on_home && (
                                    <div className="space-y-2">
                                        <Label htmlFor="home_order">{t('ترتيب الظهور', 'Display Order')}</Label>
                                        <Input
                                            id="home_order"
                                            type="number"
                                            value={editForm.home_order}
                                            onChange={(e) => setEditForm({ ...editForm, home_order: parseInt(e.target.value) || 0 })}
                                            min={0}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            {t('الأرقام الأصغر تظهر أولاً', 'Lower numbers appear first')}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setEditDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('حفظ', 'Save')}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Create Teacher Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{t('إنشاء حساب معلم', 'Create Teacher Profile')}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateTeacher} className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="create_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                            <Input
                                id="create_name"
                                value={createForm.full_name}
                                onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_email">{t('البريد الإلكتروني', 'Email')}</Label>
                            <Input
                                id="create_email"
                                type="email"
                                value={createForm.email}
                                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_bio_ar">{t('السيرة الذاتية بالعربية', 'Arabic Bio')}</Label>
                            <Textarea
                                id="create_bio_ar"
                                value={createForm.bio_ar}
                                onChange={(e) => setCreateForm({ ...createForm, bio_ar: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="create_bio_en">{t('السيرة الذاتية بالإنجليزية', 'English Bio')}</Label>
                            <Textarea
                                id="create_bio_en"
                                value={createForm.bio_en}
                                onChange={(e) => setCreateForm({ ...createForm, bio_en: e.target.value })}
                                rows={3}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>{t('المراحل الدراسية', 'Educational Stages')}</Label>
                            <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                                {allStages.map(stage => (
                                    <div key={stage.id} className="flex items-center space-x-2 space-x-reverse">
                                        <Switch
                                            id={`stage-create-${stage.id}`}
                                            checked={createForm.featured_stages.includes(stage.id)}
                                            onCheckedChange={() => toggleStage(stage.id, 'create')}
                                        />
                                        <Label htmlFor={`stage-create-${stage.id}`} className="text-xs cursor-pointer">
                                            {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                        </Label>
                                    </div>
                                ))}
                                {allStages.length === 0 && (
                                    <p className="text-xs text-muted-foreground col-span-2">
                                        {t('لا توجد مراحل متاحة', 'No stages available')}
                                    </p>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <Label htmlFor="create_active">{t('حالة الحساب', 'Account Status')}</Label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">
                                    {createForm.is_active ? t('نشط', 'Active') : t('معلق', 'Pending')}
                                </span>
                                <Switch
                                    id="create_active"
                                    checked={createForm.is_active}
                                    onCheckedChange={(checked) => setCreateForm({ ...createForm, is_active: checked })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-lg">
                            {t(
                                'ملاحظة: هذا ينشئ ملف المعلم فقط. سيحتاج المعلم للتسجيل بشكل منفصل لتسجيل الدخول.',
                                'Note: This creates a teacher profile only. The teacher will still need to register separately to log in.'
                            )}
                        </p>
                        <div className="flex gap-2 pt-4">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => setCreateDialogOpen(false)}>
                                {t('إلغاء', 'Cancel')}
                            </Button>
                            <Button type="submit" className="flex-1" disabled={submitting}>
                                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : t('إنشاء', 'Create')}
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
                            {deleteTarget?.type === 'invite'
                                ? t(
                                    `هل أنت متأكد من حذف دعوة "${(deleteTarget.item as TeacherInvite).full_name}"؟`,
                                    `Are you sure you want to delete the invite for "${(deleteTarget.item as TeacherInvite).full_name}"?`
                                )
                                : t(
                                    `هل أنت متأكد من إزالة المعلم "${(deleteTarget?.item as Profile)?.full_name || (deleteTarget?.item as Profile)?.email}"؟ سيتم تحويل الحساب إلى طالب.`,
                                    `Are you sure you want to remove "${(deleteTarget?.item as Profile)?.full_name || (deleteTarget?.item as Profile)?.email}"? The account will be converted to student.`
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
