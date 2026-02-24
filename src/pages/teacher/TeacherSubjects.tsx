import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    BookOpen,
    Users,
    ClipboardList,
    Video,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Search,
    Megaphone,
    UserPlus,
    Mail,
    Send,
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Types ──────────────────────────────────────────────────

interface TeacherSubject {
    id: string;
    title_ar: string;
    title_en: string | null;
    stage: { title_ar: string; title_en: string | null } | null;
    lessons_count: number;
    published_count: number;
}

interface SubjectStudent {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
    last_activity: string | null;
}

interface SubjectQuiz {
    id: string;
    lesson_title_ar: string;
    lesson_title_en: string | null;
    is_enabled: boolean;
    passing_score: number;
}

interface SubjectLesson {
    id: string;
    title_ar: string;
    title_en: string | null;
    is_published: boolean;
    order_index: number;
}

// ─── Hooks ──────────────────────────────────────────────────

function useTeacherSubjects(userId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', userId, 'subjects'],
        queryFn: async () => {
            // Get lessons created by this teacher, grouped by subject
            const { data: lessons, error } = await supabase
                .from('lessons')
                .select('id, subject_id, is_published, subject:subjects(id, title_ar, title_en, stage:stages(title_ar, title_en))')
                .eq('created_by', userId!);

            if (error) throw error;

            // Group by subject
            const subjectMap = new Map<string, TeacherSubject>();
            for (const lesson of (lessons || [])) {
                const subj = (lesson as any).subject;
                if (!subj) continue;
                const existing = subjectMap.get(subj.id);
                if (existing) {
                    existing.lessons_count++;
                    if ((lesson as any).is_published) existing.published_count++;
                } else {
                    subjectMap.set(subj.id, {
                        id: subj.id,
                        title_ar: subj.title_ar,
                        title_en: subj.title_en,
                        stage: subj.stage,
                        lessons_count: 1,
                        published_count: (lesson as any).is_published ? 1 : 0,
                    });
                }
            }

            return Array.from(subjectMap.values());
        },
        enabled: !!userId,
        staleTime: 5 * 60 * 1000,
    });
}

function useSubjectDetail(subjectId: string | undefined, teacherId: string | undefined) {
    return useQuery({
        queryKey: ['teacher', teacherId, 'subject-detail', subjectId],
        queryFn: async () => {
            // Fetch lessons by this teacher in this subject
            const { data: lessons, error: lessonsErr } = await supabase
                .from('lessons')
                .select('id, title_ar, title_en, is_published, order_index')
                .eq('subject_id', subjectId!)
                .eq('created_by', teacherId!)
                .order('order_index', { ascending: true });

            if (lessonsErr) throw lessonsErr;

            const lessonIds = (lessons || []).map(l => l.id);

            // Fetch quizzes for these lessons
            let quizzes: SubjectQuiz[] = [];
            if (lessonIds.length > 0) {
                const { data: quizData } = await supabase
                    .from('lesson_quizzes')
                    .select('id, lesson_id, is_enabled, passing_score')
                    .in('lesson_id', lessonIds);

                const lessonMap = new Map((lessons || []).map(l => [l.id, l]));
                quizzes = (quizData || []).map((q: any) => {
                    const lesson = lessonMap.get(q.lesson_id);
                    return {
                        id: q.id,
                        lesson_title_ar: lesson?.title_ar || '',
                        lesson_title_en: lesson?.title_en || null,
                        is_enabled: q.is_enabled,
                        passing_score: q.passing_score,
                    };
                });
            }

            // Fetch students with progress on these lessons
            let students: SubjectStudent[] = [];
            if (lessonIds.length > 0) {
                const { data: progressData } = await supabase
                    .from('lesson_progress')
                    .select('user_id, updated_at')
                    .in('lesson_id', lessonIds);

                const uniqueUserIds = [...new Set((progressData || []).map(p => p.user_id))];

                if (uniqueUserIds.length > 0) {
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, full_name, email, avatar_url')
                        .in('id', uniqueUserIds)
                        .eq('role', 'student');

                    // Get latest activity per student
                    const activityMap = new Map<string, string>();
                    for (const p of (progressData || [])) {
                        const current = activityMap.get(p.user_id);
                        if (!current || p.updated_at > current) {
                            activityMap.set(p.user_id, p.updated_at);
                        }
                    }

                    students = (profiles || []).map(p => ({
                        id: p.id,
                        full_name: p.full_name,
                        email: p.email,
                        avatar_url: p.avatar_url || null,
                        last_activity: activityMap.get(p.id) || null,
                    }));
                }
            }

            return {
                lessons: (lessons || []) as SubjectLesson[],
                quizzes,
                students,
            };
        },
        enabled: !!subjectId && !!teacherId,
        staleTime: 2 * 60 * 1000,
    });
}

// ─── Component ──────────────────────────────────────────────

export default function TeacherSubjects() {
    const { t, direction } = useLanguage();
    const { user } = useAuth();
    const [selectedSubject, setSelectedSubject] = useState<TeacherSubject | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [inviteOpen, setInviteOpen] = useState(false);
    const [inviteForm, setInviteForm] = useState({ name: '', email: '' });
    const [inviting, setInviting] = useState(false);
    const [announcementOpen, setAnnouncementOpen] = useState(false);
    const [announcementText, setAnnouncementText] = useState('');
    const [sendingAnnouncement, setSendingAnnouncement] = useState(false);

    const { data: subjects = [], isLoading } = useTeacherSubjects(user?.id);
    const { data: detail, isLoading: detailLoading } = useSubjectDetail(
        selectedSubject?.id,
        user?.id
    );

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    const filteredSubjects = useMemo(() => {
        if (!searchQuery.trim()) return subjects;
        const q = searchQuery.toLowerCase();
        return subjects.filter(s =>
            s.title_ar.toLowerCase().includes(q) ||
            s.title_en?.toLowerCase().includes(q)
        );
    }, [subjects, searchQuery]);

    const handleInviteStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inviteForm.name.trim() || !inviteForm.email.trim() || !selectedSubject) return;

        setInviting(true);
        try {
            // Send message/notification to the student
            const { data: studentProfile } = await supabase
                .from('profiles')
                .select('id')
                .eq('email', inviteForm.email.trim())
                .eq('role', 'student')
                .single();

            if (!studentProfile) {
                toast.error(t(
                    'لم يتم العثور على طالب بهذا البريد الإلكتروني',
                    'No student found with this email'
                ));
                return;
            }

            // Send an invite message
            await supabase.from('messages').insert({
                sender_id: user?.id,
                receiver_id: studentProfile.id,
                content: t(
                    `مرحباً ${inviteForm.name}، أنت مدعو للانضمام إلى مادة "${selectedSubject.title_ar}".`,
                    `Hello ${inviteForm.name}, you are invited to join the subject "${selectedSubject.title_en || selectedSubject.title_ar}".`
                ),
            });

            toast.success(t('تم إرسال الدعوة بنجاح', 'Invitation sent successfully'));
            setInviteOpen(false);
            setInviteForm({ name: '', email: '' });
        } catch {
            toast.error(t('فشل في إرسال الدعوة', 'Failed to send invitation'));
        } finally {
            setInviting(false);
        }
    };

    const handleSendAnnouncement = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!announcementText.trim() || !selectedSubject || !detail?.students.length) return;

        setSendingAnnouncement(true);
        try {
            const messages = detail.students.map(student => ({
                sender_id: user?.id,
                receiver_id: student.id,
                content: announcementText.trim(),
            }));

            const { error } = await supabase.from('messages').insert(messages);
            if (error) throw error;

            toast.success(t(
                `تم إرسال الإعلان إلى ${detail.students.length} طالب`,
                `Announcement sent to ${detail.students.length} students`
            ));
            setAnnouncementOpen(false);
            setAnnouncementText('');
        } catch {
            toast.error(t('فشل في إرسال الإعلان', 'Failed to send announcement'));
        } finally {
            setSendingAnnouncement(false);
        }
    };

    // ─── Subject Detail View ─────────────────────────────────

    if (selectedSubject) {
        return (
            <div>
                {/* Back button + title */}
                <div className="flex items-center gap-3 mb-6">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSelectedSubject(null)}
                    >
                        {direction === 'rtl'
                            ? <ChevronRight className="w-5 h-5" />
                            : <ChevronLeft className="w-5 h-5" />
                        }
                    </Button>
                    <div>
                        <h1 className="text-2xl font-semibold text-foreground">
                            {t(selectedSubject.title_ar, selectedSubject.title_en || selectedSubject.title_ar)}
                        </h1>
                        {selectedSubject.stage && (
                            <p className="text-sm text-muted-foreground">
                                {t(selectedSubject.stage.title_ar, selectedSubject.stage.title_en || selectedSubject.stage.title_ar)}
                            </p>
                        )}
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-wrap gap-2 mb-6">
                    <Button size="sm" asChild>
                        <Link to="/teacher/lessons">
                            <Video className="w-4 h-4 me-2" />
                            {t('إضافة درس مسجل', 'Add Recorded Lesson')}
                        </Link>
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                        <Link to="/teacher/quizzes">
                            <ClipboardList className="w-4 h-4 me-2" />
                            {t('الاختبارات', 'Quizzes')}
                        </Link>
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setAnnouncementOpen(true)}
                        disabled={!detail?.students.length}
                    >
                        <Megaphone className="w-4 h-4 me-2" />
                        {t('إرسال إعلان', 'Send Announcement')}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setInviteOpen(true)}>
                        <UserPlus className="w-4 h-4 me-2" />
                        {t('دعوة طالب', 'Invite Student')}
                    </Button>
                </div>

                {detailLoading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* Lessons column */}
                        <div className="bg-background rounded-lg border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Video className="w-4 h-4 text-primary" />
                                <h3 className="font-medium text-foreground">
                                    {t('الدروس', 'Lessons')}
                                </h3>
                                <Badge variant="secondary" className="ms-auto">
                                    {detail?.lessons.length || 0}
                                </Badge>
                            </div>
                            {detail?.lessons.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t('لا توجد دروس بعد', 'No lessons yet')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {detail?.lessons.map((lesson) => (
                                        <div
                                            key={lesson.id}
                                            className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50"
                                        >
                                            <span className="text-sm text-foreground truncate">
                                                {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                            </span>
                                            <Badge variant={lesson.is_published ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
                                                {lesson.is_published ? t('منشور', 'Published') : t('مسودة', 'Draft')}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Students column */}
                        <div className="bg-background rounded-lg border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <Users className="w-4 h-4 text-primary" />
                                <h3 className="font-medium text-foreground">
                                    {t('الطلاب', 'Students')}
                                </h3>
                                <Badge variant="secondary" className="ms-auto">
                                    {detail?.students.length || 0}
                                </Badge>
                            </div>
                            {detail?.students.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t('لا يوجد طلاب بعد', 'No students yet')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {detail?.students.map((student) => (
                                        <div
                                            key={student.id}
                                            className="flex items-center gap-3 px-3 py-2 rounded-md bg-secondary/50"
                                        >
                                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                                                {student.avatar_url ? (
                                                    <img src={student.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                )}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-sm text-foreground truncate">
                                                    {student.full_name || student.email}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                    {student.email}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Quizzes column */}
                        <div className="bg-background rounded-lg border border-border p-5">
                            <div className="flex items-center gap-2 mb-4">
                                <ClipboardList className="w-4 h-4 text-primary" />
                                <h3 className="font-medium text-foreground">
                                    {t('الاختبارات', 'Quizzes')}
                                </h3>
                                <Badge variant="secondary" className="ms-auto">
                                    {detail?.quizzes.length || 0}
                                </Badge>
                            </div>
                            {detail?.quizzes.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-6">
                                    {t('لا توجد اختبارات بعد', 'No quizzes yet')}
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {detail?.quizzes.map((quiz) => (
                                        <div
                                            key={quiz.id}
                                            className="flex items-center justify-between px-3 py-2 rounded-md bg-secondary/50"
                                        >
                                            <span className="text-sm text-foreground truncate">
                                                {t(quiz.lesson_title_ar, quiz.lesson_title_en || quiz.lesson_title_ar)}
                                            </span>
                                            <Badge variant={quiz.is_enabled ? 'default' : 'secondary'} className="text-[10px] flex-shrink-0">
                                                {quiz.is_enabled ? t('مفعّل', 'Active') : t('معطّل', 'Disabled')}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Invite Student Dialog */}
                <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {t('دعوة طالب', 'Invite Student')}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleInviteStudent} className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>{t('اسم الطالب', 'Student Name')} *</Label>
                                <Input
                                    value={inviteForm.name}
                                    onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                                    placeholder={t('أدخل اسم الطالب', 'Enter student name')}
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>{t('البريد الإلكتروني', 'Email')} *</Label>
                                <Input
                                    type="email"
                                    value={inviteForm.email}
                                    onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                                    placeholder={t('أدخل البريد الإلكتروني', 'Enter email address')}
                                    required
                                />
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {t(
                                    `سيتم إرسال دعوة للطالب للانضمام إلى مادة "${selectedSubject.title_ar}"`,
                                    `An invitation will be sent to join "${selectedSubject.title_en || selectedSubject.title_ar}"`
                                )}
                            </p>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setInviteOpen(false)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button type="submit" className="flex-1" disabled={inviting || !inviteForm.name.trim() || !inviteForm.email.trim()}>
                                    {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <Mail className="w-4 h-4 me-2" />
                                            {t('إرسال الدعوة', 'Send Invite')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Send Announcement Dialog */}
                <Dialog open={announcementOpen} onOpenChange={setAnnouncementOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {t('إرسال إعلان', 'Send Announcement')}
                            </DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSendAnnouncement} className="space-y-4 mt-4">
                            <p className="text-sm text-muted-foreground">
                                {t(
                                    `سيتم إرسال هذا الإعلان إلى ${detail?.students.length || 0} طالب في مادة "${selectedSubject.title_ar}"`,
                                    `This announcement will be sent to ${detail?.students.length || 0} students in "${selectedSubject.title_en || selectedSubject.title_ar}"`
                                )}
                            </p>
                            <div className="space-y-2">
                                <Label>{t('نص الإعلان', 'Announcement Text')} *</Label>
                                <Textarea
                                    value={announcementText}
                                    onChange={(e) => setAnnouncementText(e.target.value)}
                                    placeholder={t('اكتب إعلانك هنا...', 'Write your announcement here...')}
                                    rows={4}
                                    required
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="outline" className="flex-1" onClick={() => setAnnouncementOpen(false)}>
                                    {t('إلغاء', 'Cancel')}
                                </Button>
                                <Button type="submit" className="flex-1" disabled={sendingAnnouncement || !announcementText.trim()}>
                                    {sendingAnnouncement ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                                        <>
                                            <Send className="w-4 h-4 me-2" />
                                            {t('إرسال', 'Send')}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    // ─── Subjects List View ──────────────────────────────────

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('موادي', 'My Subjects')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t(
                            `${subjects.length} مادة تدرسها`,
                            `${subjects.length} subjects you teach`
                        )}
                    </p>
                </div>
            </div>

            {/* Search */}
            {subjects.length > 3 && (
                <div className="mb-4">
                    <div className="relative max-w-sm">
                        <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('بحث في المواد...', 'Search subjects...')}
                            className="ps-9"
                        />
                    </div>
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : filteredSubjects.length === 0 ? (
                <div className="bg-background rounded-lg border border-border p-12 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-2">
                        {searchQuery
                            ? t('لا توجد نتائج', 'No results found')
                            : t('لا توجد مواد بعد', 'No subjects yet')
                        }
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {searchQuery
                            ? t('حاول تغيير البحث', 'Try a different search')
                            : t('ابدأ بإنشاء دروس في مادة لتظهر هنا', 'Start by creating lessons in a subject to see it here')
                        }
                    </p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredSubjects.map((subject) => (
                        <button
                            key={subject.id}
                            onClick={() => setSelectedSubject(subject)}
                            className="bg-background rounded-lg border border-border p-5 text-start hover:border-primary/30 transition-colors group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center">
                                    <BookOpen className="w-5 h-5 text-primary" />
                                </div>
                                <ChevronIcon className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                            </div>
                            {subject.stage && (
                                <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] text-muted-foreground rounded mb-2">
                                    {t(subject.stage.title_ar, subject.stage.title_en || subject.stage.title_ar)}
                                </span>
                            )}
                            <h3 className="text-base font-medium text-foreground mb-3">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Video className="w-3.5 h-3.5" />
                                    {subject.lessons_count} {t('درس', 'lessons')}
                                </span>
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {subject.published_count} {t('منشور', 'published')}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
