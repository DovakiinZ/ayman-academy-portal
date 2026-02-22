/**
 * FeaturedSubjectsSection - Displays featured subjects on homepage
 * Admin-controlled via subjects.show_on_home
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { BookOpen, ChevronLeft, ChevronRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

import SectionTitle from '@/components/ui/SectionTitle';

export default function FeaturedSubjectsSection() {
    const { t, direction } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [subjects, setSubjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeaturedSubjects();
    }, []);

    const fetchFeaturedSubjects = async () => {
        const { data, error } = await supabase
            .from('subjects')
            .select(`
                id,
                title_ar,
                title_en,
                teaser_ar,
                teaser_en,
                stage:stages(id, slug, title_ar, title_en)
            `)
            .eq('show_on_home', true)
            .order('home_order', { ascending: true })
            .limit(4);

        if (error || !data) {
            setSubjects([]);
        } else {
            // Transform data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformed = data.map((item: any) => ({
                id: item.id,
                title_ar: item.title_ar,
                title_en: item.title_en,
                teaser_ar: item.teaser_ar,
                teaser_en: item.teaser_en,
                stage_slug: item.stage?.slug || item.stage?.id,
                stage_ar: item.stage?.title_ar,
                stage_en: item.stage?.title_en,
                lessons_count: 0, // Placeholder
            }));
            setSubjects(transformed);
        }
        setLoading(false);
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (loading) {
        return (
            <section className="py-24 bg-slate-50/50">
                <div className="container-academic">
                    <div className="flex items-center justify-center h-48 text-primary">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-24 bg-background transition-colors">
            <div className="container-academic">
                <SectionTitle
                    title={t('أهم المواد', 'Featured Subjects')}
                    subtitle={t(
                        'استكشف أبرز المواد الدراسية المتاحة على منصتنا',
                        'Explore the most popular subjects available on our platform'
                    )}
                    align="center"
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {subjects.map((subject) => (
                        <Link
                            key={subject.id}
                            to={`/stages/${subject.stage_slug}/${subject.id}`}
                            className="premium-card premium-card-accent p-6 flex flex-col group"
                        >
                            {/* Icon */}
                            <div className="w-14 h-14 rounded-2xl bg-primary/[0.03] border border-primary/5 flex items-center justify-center mb-6 transition-colors group-hover:bg-primary/5">
                                <BookOpen className="w-7 h-7 text-primary/80" />
                            </div>

                            {/* Stage Badge */}
                            <div className="flex mb-3">
                                <span className="badge-premium">
                                    {t(subject.stage_ar, subject.stage_en || subject.stage_ar)}
                                </span>
                            </div>

                            {/* Title */}
                            <h3 className="text-lg font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                                {t(subject.title_ar, subject.title_en || subject.title_ar)}
                            </h3>

                            {/* Teaser */}
                            <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2 mb-6">
                                {t(subject.teaser_ar, subject.teaser_en || subject.teaser_ar)}
                            </p>

                            {/* Stats */}
                            <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mt-auto pt-4 border-t border-border">
                                <FileText className="w-3.5 h-3.5" />
                                <span>
                                    {subject.lessons_count} {t('درس', 'lessons')}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link to="/stages">
                        <Button variant="default" className="shadow-premium px-8 h-12 rounded-xl bg-primary hover:bg-primary/90">
                            {t('استعرض جميع المواد', 'Browse All Subjects')}
                            <ChevronIcon className="w-4 h-4 ms-2" />
                        </Button>
                    </Link>
                </div>
            </div>
        </section>
    );
}
