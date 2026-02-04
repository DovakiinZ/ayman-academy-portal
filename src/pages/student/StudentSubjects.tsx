import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Level, Subject, Lesson } from '@/types/database';
import { BookOpen, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight, Loader2, AlertCircle, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { dummyLevels, getDummySubjectsForLevel } from '@/data/dummy';

interface SubjectWithLessons extends Subject {
    lessons_count?: number;
}

export default function StudentSubjects() {
    const { stageId } = useParams<{ stageId: string }>();
    const navigate = useNavigate();
    const { t, direction } = useLanguage();

    const [stage, setStage] = useState<Level | null>(null);
    const [subjects, setSubjects] = useState<SubjectWithLessons[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDummy, setIsDummy] = useState(false);

    useEffect(() => {
        if (stageId) {
            fetchData();
        }
    }, [stageId]);

    const fetchData = async () => {
        if (!stageId) return;

        try {
            setLoading(true);
            setError(null);

            // Fetch stage
            const { data: stageData, error: stageError } = await supabase
                .from('levels')
                .select('*')
                .eq('id', stageId)
                .single();

            if (stageError || !stageData) {
                // Use dummy data
                const dummyStage = dummyLevels.find(l => l.id === stageId);
                if (dummyStage) {
                    setStage(dummyStage);
                    setSubjects(getDummySubjectsForLevel(stageId) as SubjectWithLessons[]);
                    setIsDummy(true);
                } else {
                    setError('Stage not found');
                }
            } else {
                setStage(stageData);

                // Fetch subjects for this stage
                const { data: subjectsData, error: subjectsError } = await supabase
                    .from('subjects')
                    .select(`
                        *,
                        lessons(id)
                    `)
                    .eq('level_id', stageId)
                    .eq('is_active', true)
                    .order('sort_order', { ascending: true });

                if (subjectsError) {
                    setSubjects(getDummySubjectsForLevel(stageId) as SubjectWithLessons[]);
                    setIsDummy(true);
                } else {
                    setSubjects((subjectsData || []).map(s => ({
                        ...s,
                        lessons_count: s.lessons?.length || 0
                    })) as SubjectWithLessons[]);
                    setIsDummy(false);
                }
            }
        } catch (err) {
            console.error('[StudentSubjects] Error:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            setIsDummy(true);
        } finally {
            setLoading(false);
        }
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;
    const BackIcon = direction === 'rtl' ? ArrowRight : ArrowLeft;

    // Subject icons
    const getSubjectIcon = (subject: SubjectWithLessons) => {
        const icons: Record<string, string> = {
            'arabic': '📝',
            'اللغة العربية': '📝',
            'math': '🔢',
            'الرياضيات': '🔢',
            'science': '🔬',
            'العلوم': '🔬',
            'english': '🇬🇧',
            'اللغة الإنجليزية': '🇬🇧',
            'physics': '⚛️',
            'الفيزياء': '⚛️',
            'chemistry': '🧪',
            'الكيمياء': '🧪',
            'biology': '🧬',
            'الأحياء': '🧬',
            'history': '📜',
            'التاريخ': '📜',
            'geography': '🌍',
            'الجغرافيا': '🌍',
            'pe': '⚽',
            'التربية البدنية': '⚽',
        };
        return icons[subject.slug] || icons[subject.title_ar] || '📖';
    };

    if (loading) {
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
            </div>

            {/* Demo Data Badge */}
            {isDummy && (
                <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
                    <AlertCircle className="w-4 h-4" />
                    {t('يتم عرض بيانات تجريبية', 'Showing demo data')}
                </div>
            )}

            {/* Subjects Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {subjects.map((subject) => (
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
            {subjects.length === 0 && !loading && (
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
