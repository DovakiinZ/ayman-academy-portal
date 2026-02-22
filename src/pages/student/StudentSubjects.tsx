import { Link, useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubjects } from '@/hooks/useAcademyData';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Subject } from '@/types/database';
import { STALE_TIMES } from '@/lib/queryConfig';
import { BookOpen, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SubjectWithLessons extends Subject {
    lessons_count?: number;
}

export default function StudentSubjects() {
    const { stageId } = useParams<{ stageId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();

    // Fetch stage info (cached)
    const { data: stage, isLoading: stageLoading } = useQuery<any>({
        queryKey: ['stage', stageId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stages')
                .select('*')
                .eq('id', stageId!)
                .single();
            if (error) throw error;
            return data as any;
        },
        enabled: !!stageId,
        staleTime: STALE_TIMES.STATIC,
    });

    // Fetch subjects for this stage (cached)
    const { data: subjects = [], isLoading: subjectsLoading, isFetching } = useSubjects(stageId);

    const isLoading = stageLoading || subjectsLoading;
    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;
    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    const getSubjectIcon = (subject: SubjectWithLessons) => {
        const icons: Record<string, string> = {
            'arabic': '📝', 'اللغة العربية': '📝',
            'math': '🔢', 'الرياضيات': '🔢',
            'science': '🔬', 'العلوم': '🔬',
            'english': '🇬🇧', 'اللغة الإنجليزية': '🇬🇧',
            'physics': '⚛️', 'الفيزياء': '⚛️',
            'chemistry': '🧪', 'الكيمياء': '🧪',
            'biology': '🧬', 'الأحياء': '🧬',
            'history': '📜', 'التاريخ': '📜',
            'geography': '🌍', 'الجغرافيا': '🌍',
            'pe': '⚽', 'التربية البدنية': '⚽',
        };
        return icons[subject.title_en?.toLowerCase() || ''] || icons[subject.title_ar] || '📖';
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!stage) {
        return (
            <div className="text-center py-12">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-lg font-semibold text-foreground mb-2">
                    {t('المرحلة غير موجودة', 'Stage not found')}
                </h2>
                <Button variant="outline" onClick={() => navigate('/student/stages')}>
                    <BackIcon className="w-4 h-4 me-2" />
                    {t('العودة للمراحل', 'Back to stages')}
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header with Back Button */}
            <div className="flex items-start gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate('/student/stages')}
                    className="shrink-0"
                >
                    <BackIcon className="w-4 h-4 me-1" />
                    {t('عودة', 'Back')}
                </Button>
                <div className="flex-1">
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t(stage.title_ar, stage.title_en || stage.title_ar)}
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        {t('اختر المادة للوصول إلى الدروس', 'Choose a subject to access lessons')}
                    </p>
                </div>
                {isFetching && !isLoading && (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        {t('جاري التحديث...', 'Updating...')}
                    </div>
                )}
            </div>

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {(subjects as SubjectWithLessons[]).map((subject) => (
                    <Link
                        key={subject.id}
                        to={`/student/subjects/${subject.id}`}
                        className="group flex items-center gap-4 p-4 bg-background rounded-lg border border-border hover:border-primary/50 hover:shadow-md transition-all"
                    >
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl shrink-0">
                            {getSubjectIcon(subject)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {subject.lessons_count || 0} {t('درس', 'lessons')}
                            </p>
                        </div>
                        <ChevronIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                    </Link>
                ))}
            </div>

            {/* Empty State */}
            {subjects.length === 0 && !isLoading && (
                <div className="bg-background rounded-lg border border-border p-8 text-center">
                    <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="font-medium text-foreground mb-2">
                        {t('لا توجد مواد متاحة', 'No subjects available')}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                        {t('سيتم إضافة المواد قريباً', 'Subjects will be added soon')}
                    </p>
                </div>
            )}
        </div>
    );
}
