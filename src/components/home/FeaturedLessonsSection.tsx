/**
 * FeaturedLessonsSection - Displays featured lessons on homepage
 * Admin-controlled via lessons.show_on_home
 */

import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useFeaturedLessons } from '@/hooks/useQueryHooks';
import { Play, Lock, Clock, User } from 'lucide-react';

export default function FeaturedLessonsSection() {
    const { t } = useLanguage();
    const { data: rawLessons = [], isLoading: loading } = useFeaturedLessons();

    const lessons = rawLessons.map((lesson: any) => {
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

    if (loading) {
        return (
            <section className="section-academic bg-secondary/30">
                <div className="container-academic">
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="section-academic bg-secondary/30">
            <div className="container-academic">
                <div className="text-center mb-10">
                    <h2 className="text-foreground mb-3">
                        {t('نماذج من الدروس', 'Sample Lessons')}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                        {t(
                            'استعرض بعض الدروس المتاحة في منصتنا',
                            'Preview some of the lessons available on our platform'
                        )}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                    {lessons.map((lesson: any) => (
                        <Link
                            key={lesson.id}
                            to={lesson.is_preview ? `/lesson/${lesson.id}` : '#'}
                            className={`academic-card p-0 overflow-hidden group ${!lesson.is_preview ? 'lesson-locked cursor-default' : ''
                                }`}
                        >
                            {/* Thumbnail */}
                            <div className="relative aspect-video overflow-hidden bg-secondary">
                                <img
                                    src={lesson.thumbnail}
                                    alt={t(lesson.title_ar, lesson.title_en)}
                                    className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-foreground/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {lesson.is_preview ? (
                                        <div className="w-10 h-10 rounded-full bg-background/95 flex items-center justify-center">
                                            <Play className="w-4 h-4 text-primary ms-0.5" />
                                        </div>
                                    ) : (
                                        <div className="w-10 h-10 rounded-full bg-background/95 flex items-center justify-center">
                                            <Lock className="w-4 h-4 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>
                                {!lesson.is_preview && (
                                    <div className="absolute top-2 end-2">
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-background/90 rounded text-[10px] text-muted-foreground">
                                            <Lock className="w-2.5 h-2.5" />
                                            {t('للمشتركين', 'Subscribers')}
                                        </span>
                                    </div>
                                )}
                                {lesson.is_preview && (
                                    <div className="absolute top-2 end-2">
                                        <span className="badge-gold text-[10px]">
                                            {t('معاينة', 'Preview')}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-4">
                                <div className="flex items-center gap-1.5 mb-2 text-[10px] text-muted-foreground">
                                    <span>{t(lesson.stage_ar, lesson.stage_en || lesson.stage_ar)}</span>
                                    <span>·</span>
                                    <span className="text-primary">
                                        {t(lesson.subject_ar, lesson.subject_en || lesson.subject_ar)}
                                    </span>
                                </div>
                                <h4 className="font-medium text-foreground text-sm mb-2 line-clamp-2">
                                    {t(lesson.title_ar, lesson.title_en || lesson.title_ar)}
                                </h4>
                                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                                    {lesson.instructor && (
                                        <span className="flex items-center gap-1">
                                            <User className="w-3 h-3" />
                                            {lesson.instructor}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {lesson.duration}
                                    </span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                <div className="text-center mt-8">
                    <Link
                        to="/stages"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('استعرض جميع الدروس', 'Browse All Lessons')}
                    </Link>
                </div>
            </div>
        </section>
    );
}
