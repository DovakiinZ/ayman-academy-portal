/**
 * FeaturedSubjectsSection - Displays featured subjects on homepage
 * Admin-controlled via subjects.show_on_home
 */

import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeaturedSubjects } from '@/hooks/useQueryHooks';
import { BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function FeaturedSubjectsSection() {
    const { t, direction } = useLanguage();
    const { data: rawSubjects = [], isLoading: loading } = useFeaturedSubjects();

    const subjects = rawSubjects.map((item: any) => ({
        id: item.id,
        title_ar: item.title_ar,
        title_en: item.title_en,
        teaser_ar: item.teaser_ar,
        teaser_en: item.teaser_en,
        stage_ar: item.stage?.title_ar,
        stage_en: item.stage?.title_en,
        lessons_count: 0,
    }));

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
                    {subjects.map((subject: any) => (
                        <Link
                            key={subject.id}
                            to={`/subject/${subject.id}`}
                            className="academic-card group hover:border-primary/30 transition-colors"
                        >
                            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6 text-primary" />
                            </div>
                            <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] text-muted-foreground rounded mb-2">
                                {t(subject.stage_ar, subject.stage_en || subject.stage_ar)}
                            </span>
                            <h3 className="text-base font-medium text-foreground mb-2">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>
                            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                                {t(subject.teaser_ar, subject.teaser_en || subject.teaser_ar)}
                            </p>
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
