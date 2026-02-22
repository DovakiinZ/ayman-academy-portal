/**
 * FeaturedLessonsSection - Displays featured lessons on homepage
 * Admin-controlled via lessons.show_on_home
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Play, Lock, Clock, User } from 'lucide-react';

import SectionTitle from '@/components/ui/SectionTitle';

export default function FeaturedLessonsSection() {
    const { t } = useLanguage();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeaturedLessons();
    }, []);

    const fetchFeaturedLessons = async () => {
        const { data, error } = await supabase
            .from('lessons')
            .select(`
                id,
                title_ar,
                title_en,
                teaser_ar,
                teaser_en,
                preview_video_url,
                duration_seconds,
                course:courses(
                    teacher:profiles(full_name)
                ),
                subject:subjects(
                    title_ar,
                    title_en,
                    stage:stages(title_ar, title_en)
                )
            `)
            .eq('show_on_home', true)
            .order('home_order', { ascending: true })
            .limit(4);

        if (error || !data) {
            setLessons([]);
        } else {
            // Transform data
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const transformed = data.map((lesson: any) => {
                const duration = lesson.duration_seconds
                    ? `${Math.floor(lesson.duration_seconds / 60)}:${(lesson.duration_seconds % 60).toString().padStart(2, '0')}`
                    : '10:00';

                return {
                    id: lesson.id,
                    title_ar: lesson.title_ar,
                    title_en: lesson.title_en,
                    teaser_ar: lesson.teaser_ar,
                    teaser_en: lesson.teaser_en,
                    subject_ar: lesson.subject?.title_ar,
                    subject_en: lesson.subject?.title_en,
                    stage_ar: lesson.subject?.stage?.title_ar,
                    stage_en: lesson.subject?.stage?.title_en,
                    instructor: lesson.course?.teacher?.full_name,
                    duration,
                    is_preview: !!lesson.preview_video_url,
                    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=225&fit=crop',
                };
            });
            setLessons(transformed);
        }
        setLoading(false);
    };

    if (loading) {
        return (
            <section className="py-24 transition-colors">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-center h-48 text-primary">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-24 transition-colors">
            <div className="max-w-7xl mx-auto px-6">
                <SectionTitle
                    title={t('نماذج من الدروس', 'Sample Lessons')}
                    subtitle={t(
                        'استعرض بعض الدروس المميزة المتاحة لمعاينة جودة المحتوى الأكاديمي',
                        'Preview some of our featured lessons to see the quality of our academic content'
                    )}
                    align="center"
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {lessons.map((lesson) => (
                        <Link
                            key={lesson.id}
                            to={lesson.is_preview ? `/lesson/${lesson.id}` : '#'}
                            className={`premium-card p-0 overflow-hidden flex flex-col group ${!lesson.is_preview ? 'opacity-80 grayscale-[0.5] cursor-default' : ''
                                }`}
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video overflow-hidden bg-slate-100">
                                <img
                                    src={lesson.thumbnail}
                                    alt={t(lesson.title_ar, lesson.title_en)}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                />
                                <div className="absolute inset-0 bg-slate-900/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {lesson.is_preview ? (
                                        <div className="w-12 h-12 rounded-full bg-background/95 shadow-xl flex items-center justify-center transition-transform group-hover:scale-110">
                                            <Play className="w-5 h-5 text-primary ms-0.5 fill-primary" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-background/95 shadow-xl flex items-center justify-center">
                                            <Lock className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                {!lesson.is_preview && (
                                    <div className="absolute top-3 end-3">
                                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-background/90 backdrop-blur-sm rounded-lg text-[10px] font-bold text-muted-foreground shadow-sm border border-border">
                                            <Lock className="w-2.5 h-2.5 text-muted-foreground" />
                                            {t('للمشتركين', 'Premium')}
                                        </span>
                                    </div>
                                )}
                                {lesson.is_preview && (
                                    <div className="absolute top-3 end-3">
                                        <span className="badge-premium bg-background/90 backdrop-blur-sm shadow-sm">
                                            {t('معاينة', 'Preview')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-5 flex-1 flex flex-col">
                                <div className="flex items-center gap-2 mb-3 text-[10px] font-bold uppercase tracking-wider">
                                    <span className="text-muted-foreground">{t(lesson.stage_ar, lesson.stage_en || lesson.stage_ar)}</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                                    <span className="text-primary/70">
                                        {t(lesson.subject_ar, lesson.subject_en || lesson.subject_ar)}
                                    </span>
                                </div>
                                <h4 className="font-bold text-foreground text-[15px] mb-4 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                </h4>
                                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mt-auto pt-4 border-t border-border">
                                    {lesson.instructor && (
                                        <span className="flex items-center gap-1.5">
                                            <User className="w-3.5 h-3.5 text-muted-foreground" />
                                            {lesson.instructor}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1.5">
                                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                                        {lesson.duration}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link
                        to="/lessons"
                        className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                        {t('استعرض جميع الدروس', 'Browse All Lessons')}
                    </Link>
                </div>
            </div>
        </section>
    );
}
