/**
 * FeaturedLessonsSection - Displays featured lessons on homepage
 * Admin-controlled via home_featured_lessons table
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Play, Lock, Clock, User } from 'lucide-react';

// Fallback dummy data
const dummyLessons = [
    {
        id: '1',
        title_ar: 'مقدمة في الجمع والطرح',
        title_en: 'Introduction to Addition and Subtraction',
        teaser_ar: 'تعلم أساسيات العمليات الحسابية',
        subject_ar: 'الرياضيات',
        subject_en: 'Mathematics',
        stage_ar: 'الابتدائي',
        stage_en: 'Primary',
        instructor: 'د. أحمد الفاروق',
        duration: '12:30',
        is_preview: true,
        thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop',
    },
    {
        id: '2',
        title_ar: 'الحروف الأبجدية العربية',
        title_en: 'Arabic Alphabet',
        teaser_ar: 'تعلم الحروف العربية بطريقة ممتعة',
        subject_ar: 'اللغة العربية',
        subject_en: 'Arabic Language',
        stage_ar: 'التمهيدي',
        stage_en: 'Kindergarten',
        instructor: 'أ. فاطمة السعيد',
        duration: '08:45',
        is_preview: true,
        thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=225&fit=crop',
    },
    {
        id: '3',
        title_ar: 'دورة الماء في الطبيعة',
        title_en: 'The Water Cycle',
        teaser_ar: 'اكتشف كيف تتحول المياه في الطبيعة',
        subject_ar: 'العلوم',
        subject_en: 'Science',
        stage_ar: 'المتوسط',
        stage_en: 'Middle School',
        instructor: 'د. سارة الأحمد',
        duration: '15:20',
        is_preview: false,
        thumbnail: 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=400&h=225&fit=crop',
    },
    {
        id: '4',
        title_ar: 'أساسيات اللغة الإنجليزية',
        title_en: 'English Basics',
        teaser_ar: 'ابدأ رحلتك في تعلم الإنجليزية',
        subject_ar: 'اللغة الإنجليزية',
        subject_en: 'English Language',
        stage_ar: 'الابتدائي',
        stage_en: 'Primary',
        instructor: 'أ. محمد العلي',
        duration: '10:15',
        is_preview: false,
        thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=225&fit=crop',
    },
];

export default function FeaturedLessonsSection() {
    const { t } = useLanguage();
    const [lessons, setLessons] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeaturedLessons();
    }, []);

    const fetchFeaturedLessons = async () => {
        const { data, error } = await supabase
            .from('home_featured_lessons')
            .select(`
                *,
                lesson:lessons(
                    id,
                    title_ar,
                    title_en,
                    preview_video_url,
                    duration_seconds,
                    course:courses(
                        title_ar,
                        title_en,
                        teacher:profiles(full_name)
                    ),
                    subject:subjects(
                        title_ar,
                        title_en,
                        level:levels(title_ar, title_en)
                    )
                )
            `)
            .eq('is_visible', true)
            .order('home_order', { ascending: true })
            .limit(4);

        if (error || !data || data.length === 0) {
            setLessons(dummyLessons);
        } else {
            // Transform data
            const transformed = data.map((item: any) => {
                const lesson = item.lesson;
                const duration = lesson?.duration_seconds
                    ? `${Math.floor(lesson.duration_seconds / 60)}:${(lesson.duration_seconds % 60).toString().padStart(2, '0')}`
                    : '10:00';

                return {
                    id: lesson?.id || item.id,
                    title_ar: lesson?.title_ar || '',
                    title_en: lesson?.title_en || '',
                    teaser_ar: item.teaser_ar || '',
                    teaser_en: item.teaser_en || '',
                    subject_ar: lesson?.subject?.title_ar || lesson?.course?.title_ar || '',
                    subject_en: lesson?.subject?.title_en || lesson?.course?.title_en || '',
                    stage_ar: lesson?.subject?.level?.title_ar || '',
                    stage_en: lesson?.subject?.level?.title_en || '',
                    instructor: lesson?.course?.teacher?.full_name || '',
                    duration,
                    is_preview: !!lesson?.preview_video_url,
                    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=225&fit=crop',
                };
            });
            setLessons(transformed);
        }
        setLoading(false);
    };

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
                    {lessons.map((lesson) => (
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
