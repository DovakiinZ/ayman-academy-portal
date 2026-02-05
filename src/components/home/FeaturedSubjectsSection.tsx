/**
 * FeaturedSubjectsSection - Displays featured subjects on homepage
 * Admin-controlled via home_featured_subjects table
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { HomeFeaturedSubject, Subject, Level } from '@/types/database';
import { BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface FeaturedSubjectWithDetails extends HomeFeaturedSubject {
    subject: Subject & { level?: Level; lessons_count?: number };
}

// Fallback dummy data
const dummySubjects = [
    {
        id: '1',
        title_ar: 'الرياضيات',
        title_en: 'Mathematics',
        teaser_ar: 'أساسيات الجمع والطرح والضرب والقسمة',
        teaser_en: 'Fundamentals of addition, subtraction, multiplication, and division',
        stage_ar: 'الابتدائي',
        stage_en: 'Primary',
        lessons_count: 24,
    },
    {
        id: '2',
        title_ar: 'اللغة العربية',
        title_en: 'Arabic Language',
        teaser_ar: 'النحو والصرف والبلاغة والقراءة',
        teaser_en: 'Grammar, morphology, rhetoric, and reading',
        stage_ar: 'المتوسط',
        stage_en: 'Middle School',
        lessons_count: 32,
    },
    {
        id: '3',
        title_ar: 'العلوم',
        title_en: 'Science',
        teaser_ar: 'الفيزياء والكيمياء والأحياء',
        teaser_en: 'Physics, Chemistry, and Biology',
        stage_ar: 'الثانوي',
        stage_en: 'High School',
        lessons_count: 48,
    },
    {
        id: '4',
        title_ar: 'اللغة الإنجليزية',
        title_en: 'English Language',
        teaser_ar: 'القواعد والمفردات والمحادثة',
        teaser_en: 'Grammar, vocabulary, and conversation',
        stage_ar: 'الابتدائي',
        stage_en: 'Primary',
        lessons_count: 28,
    },
];

export default function FeaturedSubjectsSection() {
    const { t, direction } = useLanguage();
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeaturedSubjects();
    }, []);

    const fetchFeaturedSubjects = async () => {
        const { data, error } = await supabase
            .from('home_featured_subjects')
            .select(`
                *,
                subject:subjects(
                    id,
                    title_ar,
                    title_en,
                    stage:stages(id, title_ar, title_en)
                )
            `)
            .eq('is_visible', true)
            .order('home_order', { ascending: true })
            .limit(4);

        if (error || !data || data.length === 0) {
            setSubjects(dummySubjects);
        } else {
            // Transform data
            const transformed = data.map((item: any) => ({
                id: item.subject?.id || item.id,
                title_ar: item.subject?.title_ar || '',
                title_en: item.subject?.title_en || '',
                teaser_ar: item.teaser_ar || '',
                teaser_en: item.teaser_en || '',
                stage_ar: item.subject?.stage?.title_ar || '',
                stage_en: item.subject?.stage?.title_en || '',
                lessons_count: 0, // Would need a separate count query
            }));
            setSubjects(transformed);
        }
        setLoading(false);
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (loading) {
        return (
            <section className="section-academic">
                <div className="container-academic">
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="section-academic">
            <div className="container-academic">
                <div className="text-center mb-10">
                    <h2 className="text-foreground mb-3">
                        {t('أهم المواد', 'Featured Subjects')}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                        {t(
                            'استكشف أبرز المواد الدراسية المتاحة على منصتنا',
                            'Explore the most popular subjects available on our platform'
                        )}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {subjects.map((subject) => (
                        <Link
                            key={subject.id}
                            to={`/subject/${subject.id}`}
                            className="academic-card group hover:border-primary/30 transition-colors"
                        >
                            {/* Icon */}
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>

                            {/* Stage Badge */}
                            <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] text-muted-foreground rounded mb-2">
                                {t(subject.stage_ar, subject.stage_en || subject.stage_ar)}
                            </span>

                            {/* Title */}
                            <h3 className="text-base font-medium text-foreground mb-2">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>

                            {/* Teaser */}
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {t(subject.teaser_ar, subject.teaser_en || subject.teaser_ar)}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-3 border-t border-border">
                                <FileText className="w-3.5 h-3.5" />
                                <span>
                                    {subject.lessons_count} {t('درس', 'lessons')}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="text-center mt-8">
                    <Link to="/stages">
                        <Button variant="outline" size="sm">
                            {t('استعرض جميع المواد', 'Browse All Subjects')}
                            <ChevronIcon className="w-4 h-4 ms-2" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
