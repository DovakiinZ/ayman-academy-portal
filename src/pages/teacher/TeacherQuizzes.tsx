import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Quiz } from '@/types/database';
import { dummyQuizzes } from '@/data/dummyQuiz';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    Plus,
    Search,
    ClipboardList,
    BookOpen,
    FileText,
    Eye,
    EyeOff,
    CheckCircle,
    Clock,
    Edit2,
    Trash2,
    AlertCircle,
} from 'lucide-react';

export default function TeacherQuizzes() {
    const { t, direction } = useLanguage();
    const { profile } = useAuth();
    const mountedRef = useRef(true);

    // State
    const [quizzes, setQuizzes] = useState<Quiz[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);
    const [search, setSearch] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'published' | 'draft'>('all');
    const [filterType, setFilterType] = useState<'all' | 'lesson' | 'course'>('all');

    // Cleanup on unmount
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Fetch quizzes
    const fetchQuizzes = useCallback(async () => {
        if (!profile?.id || !mountedRef.current) return;

        setLoading(true);
        setError(null);

        try {
            // Build query for teacher's quizzes
            let query = supabase
                .from('quizzes')
                .select(`
                    *,
                    lesson:lessons(id, title_ar, title_en, course:courses(id, title_ar, title_en)),
                    course:courses(id, title_ar, title_en)
                `)
                .eq('created_by', profile.id)
                .order('created_at', { ascending: false });

            // Apply filters
            if (filterStatus === 'published') {
                query = query.eq('is_published', true);
            } else if (filterStatus === 'draft') {
                query = query.eq('is_published', false);
            }

            if (filterType !== 'all') {
                query = query.eq('attachment_type', filterType);
            }

            const { data, error: fetchError } = await query;

            if (!mountedRef.current) return;

            if (fetchError) {
                console.error('[TeacherQuizzes] Fetch error:', fetchError);
                // Fallback to dummy data
                setQuizzes(dummyQuizzes.filter(q => q.created_by === profile.id || true)); // Show all dummy for demo
                setIsDummy(true);
                setError(fetchError.message);
            } else if (!data || data.length === 0) {
                // No quizzes yet, use empty or dummy for demo
                setQuizzes(dummyQuizzes);
                setIsDummy(true);
            } else {
                setQuizzes(data as Quiz[]);
                setIsDummy(false);
            }
        } catch (err) {
            if (!mountedRef.current) return;
            console.error('[TeacherQuizzes] Error:', err);
            setQuizzes(dummyQuizzes);
            setIsDummy(true);
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }, [profile?.id, filterStatus, filterType]);

    useEffect(() => {
        fetchQuizzes();
    }, [fetchQuizzes]);

    // Filter by search
    const filteredQuizzes = quizzes.filter(quiz => {
        if (!search) return true;
        const searchLower = search.toLowerCase();
        return (
            quiz.title_ar.toLowerCase().includes(searchLower) ||
            (quiz.title_en && quiz.title_en.toLowerCase().includes(searchLower))
        );
    });

    // Delete quiz
    const handleDelete = async (quizId: string) => {
        if (!confirm(t('هل أنت متأكد من حذف هذا الاختبار؟', 'Are you sure you want to delete this quiz?'))) {
            return;
        }

        const { error: deleteError } = await supabase
            .from('quizzes')
            .delete()
            .eq('id', quizId);

        if (deleteError) {
            console.error('Delete error:', deleteError);
        } else {
            fetchQuizzes();
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        {t('الاختبارات', 'Quizzes')}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {t('إنشاء وإدارة الاختبارات للدروس والدورات', 'Create and manage quizzes for lessons and courses')}
                    </p>
                </div>
                <Link to="/teacher/quizzes/new">
                    <Button>
                        <Plus className="w-4 h-4 me-2" />
                        {t('إنشاء اختبار', 'Create Quiz')}
                    </Button>
                </Link>
            </div>

            {/* Dummy data badge */}
            {isDummy && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-lg text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    {t('بيانات تجريبية - قم بإنشاء اختبار لرؤية بياناتك الفعلية', 'Demo data - Create a quiz to see your actual data')}
                </div>
            )}

            {/* Error message */}
            {error && (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive px-4 py-3 rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder={t('بحث...', 'Search...')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="ps-9"
                    />
                </div>

                <Select value={filterStatus} onValueChange={(v: typeof filterStatus) => setFilterStatus(v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                        <SelectItem value="published">{t('منشور', 'Published')}</SelectItem>
                        <SelectItem value="draft">{t('مسودة', 'Draft')}</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={filterType} onValueChange={(v: typeof filterType) => setFilterType(v)}>
                    <SelectTrigger className="w-[140px]">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">{t('الكل', 'All')}</SelectItem>
                        <SelectItem value="lesson">{t('درس', 'Lesson')}</SelectItem>
                        <SelectItem value="course">{t('دورة', 'Course')}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Loading state */}
            {loading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
            ) : filteredQuizzes.length === 0 ? (
                <div className="text-center py-12 bg-background rounded-lg border border-border">
                    <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                    <p className="text-muted-foreground">
                        {search
                            ? t('لا توجد نتائج للبحث', 'No search results')
                            : t('لم تقم بإنشاء أي اختبارات بعد', 'No quizzes created yet')}
                    </p>
                    {!search && (
                        <Link to="/teacher/quizzes/new" className="mt-4 inline-block">
                            <Button variant="outline" size="sm">
                                <Plus className="w-4 h-4 me-2" />
                                {t('إنشاء اختبار جديد', 'Create New Quiz')}
                            </Button>
                        </Link>
                    )}
                </div>
            ) : (
                /* Quiz cards */
                <div className="grid gap-4">
                    {filteredQuizzes.map((quiz) => (
                        <div
                            key={quiz.id}
                            className="bg-background border border-border rounded-lg p-4 hover:border-primary/50 transition-colors"
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                {/* Icon */}
                                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                    {quiz.attachment_type === 'lesson' ? (
                                        <FileText className="w-6 h-6 text-primary" />
                                    ) : (
                                        <BookOpen className="w-6 h-6 text-primary" />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start gap-2">
                                        <h3 className="font-semibold text-foreground truncate">
                                            {t(quiz.title_ar, quiz.title_en || quiz.title_ar)}
                                        </h3>
                                        {quiz.is_published ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                                                <Eye className="w-3 h-3" />
                                                {t('منشور', 'Published')}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                                                <EyeOff className="w-3 h-3" />
                                                {t('مسودة', 'Draft')}
                                            </span>
                                        )}
                                    </div>

                                    <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            {quiz.attachment_type === 'lesson' ? (
                                                <>
                                                    <FileText className="w-3.5 h-3.5" />
                                                    {t('مرتبط بدرس', 'Lesson quiz')}
                                                </>
                                            ) : (
                                                <>
                                                    <BookOpen className="w-3.5 h-3.5" />
                                                    {t('اختبار دورة', 'Course quiz')}
                                                </>
                                            )}
                                        </span>

                                        <span className="flex items-center gap-1">
                                            <ClipboardList className="w-3.5 h-3.5" />
                                            {quiz.questions_count || 0} {t('سؤال', 'questions')}
                                        </span>

                                        {quiz.is_required && (
                                            <span className="flex items-center gap-1 text-amber-600">
                                                <CheckCircle className="w-3.5 h-3.5" />
                                                {t('إلزامي', 'Required')}
                                            </span>
                                        )}

                                        {quiz.time_limit_minutes && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3.5 h-3.5" />
                                                {quiz.time_limit_minutes} {t('دقيقة', 'min')}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-2 shrink-0">
                                    <Link to={`/teacher/quizzes/${quiz.id}/edit`}>
                                        <Button variant="outline" size="sm">
                                            <Edit2 className="w-4 h-4 me-1" />
                                            {t('تعديل', 'Edit')}
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(quiz.id)}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
