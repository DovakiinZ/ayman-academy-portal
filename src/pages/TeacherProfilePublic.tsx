import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherShowcaseData } from '@/hooks/useQueryHooks';
import {
    User, ChevronLeft, ChevronRight, BookOpen, GraduationCap,
    Star, Users, Clock, CheckCircle, Quote, Medal, Video,
    Facebook, Twitter, Linkedin, Instagram, Globe
} from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherProfilePublic() {
    const { id } = useParams();
    const { t, direction } = useLanguage();
    const { data: showcase, isLoading, error } = useTeacherShowcaseData(id);

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (isLoading) {
        return (
            <Layout>
                <div className="container-academic py-20 flex flex-col gap-12">
                    <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-start">
                        <Skeleton className="w-40 h-40 rounded-full flex-shrink-0" />
                        <div className="flex-1 space-y-4 w-full max-w-2xl">
                            <Skeleton className="h-12 w-3/4 mx-auto md:mx-0" />
                            <Skeleton className="h-6 w-1/2 mx-auto md:mx-0" />
                            <div className="flex justify-center md:justify-start gap-4 pt-4">
                                <Skeleton className="h-10 w-32" />
                                <Skeleton className="h-10 w-32" />
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !showcase || !showcase.profile) {
        return (
            <Layout>
                <div className="container-academic py-24 text-center">
                    <h2 className="text-2xl font-bold text-foreground mb-4">
                        {t('المعلم غير موجود', 'Teacher not found')}
                    </h2>
                    <p className="text-muted-foreground mb-8">
                        {t('عذراً، لم نتمكن من العثور على ملف المعلم المطلوب.', 'Sorry, we couldn\'t find the requested teacher profile.')}
                    </p>
                    <Link to="/">
                        <Button>{t('العودة للرئيسية', 'Back to Home')}</Button>
                    </Link>
                </div>
            </Layout>
        );
    }

    const { profile, courses, stats, reviews } = showcase as any;

    // Collect distinct stages from courses
    const stageMap = new Map<string, any>();
    courses.forEach((c: any) => {
        if (c.stage) {
            stageMap.set(c.stage.id, c.stage);
        }
    });
    const stages = Array.from(stageMap.values());

    const scrollToCourses = (e: React.MouseEvent) => {
        e.preventDefault();
        const element = document.getElementById('courses');
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <Layout>
            {/* 1) HERO SECTION */}
            <section className="bg-secondary/20 relative border-b border-border overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/5 opacity-5" />
                <div className="container-academic py-16 md:py-24 relative z-10">
                    <div className="flex flex-col md:flex-row gap-10 items-center md:items-start text-center md:text-start max-w-6xl mx-auto">
                        <div className="w-40 h-40 md:w-56 md:h-56 rounded-full bg-background flex-shrink-0 overflow-hidden border-4 border-background shadow-2xl relative">
                            {profile.avatar_url ? (
                                <img
                                    src={profile.avatar_url}
                                    alt={profile.full_name || ''}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-secondary/50">
                                    <User className="w-20 h-20 text-muted-foreground/50" />
                                </div>
                            )}
                            <div className="absolute bottom-2 end-2 bg-primary text-primary-foreground p-1.5 rounded-full shadow-lg border-2 border-background">
                                <Medal className="w-5 h-5" />
                            </div>
                        </div>

                        <div className="flex-1 space-y-6">
                            <div>
                                <h1 className="text-4xl md:text-5xl font-black text-foreground mb-3 tracking-tight">
                                    {profile.full_name}
                                </h1>
                                <p className="text-xl text-primary font-medium mb-4">
                                    {t('خبير متخصص ومقدم محتوى تعليمي متميز', 'Expert Educator & Premium Content Creator')}
                                </p>
                                <p className="text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0">
                                    {/* Using teaser or first part of bio as a positioning statement */}
                                    {t(
                                        profile.bio_ar?.slice(0, 120) + (profile.bio_ar?.length > 120 ? '...' : '') || 'معلم خبير بشهادات أكاديمية معتمدة.',
                                        profile.bio_en?.slice(0, 120) + (profile.bio_en?.length > 120 ? '...' : '') || 'Expert instructor with certified academic credentials.'
                                    )}
                                </p>
                            </div>

                            {/* Social Links Bar */}
                            {profile.social_links && Object.values(profile.social_links).some(v => !!v) && (
                                <div className="flex flex-wrap justify-center md:justify-start gap-3">
                                    {profile.social_links.facebook && (
                                        <a href={profile.social_links.facebook} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-background rounded-xl border border-border hover:text-primary transition-all hover:scale-110 shadow-sm">
                                            <Facebook className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links.twitter && (
                                        <a href={profile.social_links.twitter} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-background rounded-xl border border-border hover:text-primary transition-all hover:scale-110 shadow-sm">
                                            <Twitter className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links.linkedin && (
                                        <a href={profile.social_links.linkedin} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-background rounded-xl border border-border hover:text-primary transition-all hover:scale-110 shadow-sm">
                                            <Linkedin className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links.instagram && (
                                        <a href={profile.social_links.instagram} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-background rounded-xl border border-border hover:text-primary transition-all hover:scale-110 shadow-sm">
                                            <Instagram className="w-5 h-5" />
                                        </a>
                                    )}
                                    {profile.social_links.website && (
                                        <a href={profile.social_links.website} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-background rounded-xl border border-border hover:text-primary transition-all hover:scale-110 shadow-sm">
                                            <Globe className="w-5 h-5" />
                                        </a>
                                    )}
                                </div>
                            )}

                            {/* Trust Indicators / Stats */}
                            <div className="flex flex-wrap justify-center md:justify-start gap-6 py-4 border-y border-border/50">
                                <div className="flex items-center gap-2">
                                    <div className="bg-amber-500/10 p-2 rounded-lg">
                                        <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                                    </div>
                                    <div className="flex flex-col text-start">
                                        <span className="font-bold text-lg leading-tight">{stats.averageRating > 0 ? stats.averageRating : 'جديد'}</span>
                                        <span className="text-xs text-muted-foreground">{t('التقييمات', 'Reviews')} ({stats.totalReviews})</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-blue-500/10 p-2 rounded-lg">
                                        <Users className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div className="flex flex-col text-start">
                                        <span className="font-bold text-lg leading-tight">{stats.totalStudents > 0 ? `+${stats.totalStudents}` : '0'}</span>
                                        <span className="text-xs text-muted-foreground">{t('الطلاب', 'Students')}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="bg-emerald-500/10 p-2 rounded-lg">
                                        <Video className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <div className="flex flex-col text-start">
                                        <span className="font-bold text-lg leading-tight">{stats.totalCourses}</span>
                                        <span className="text-xs text-muted-foreground">{t('الدورات', 'Courses')}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-wrap justify-center md:justify-start gap-4">
                                <Button onClick={scrollToCourses} size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/20">
                                    {t('استعرض الدورات', 'Explore Courses')}
                                </Button>
                                <Link to="/register">
                                    <Button variant="outline" size="lg" className="rounded-full px-8 h-12 text-base border-2 hover:bg-secondary/50">
                                        {t('سجل الآن', 'Register Now')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 2) WHY STUDENTS CHOOSE THIS TEACHER */}
            <section className="py-16 bg-background">
                <div className="container-academic max-w-6xl">
                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-center md:items-start text-center md:text-start p-6 rounded-2xl bg-secondary/10 border border-border/50 transition-colors hover:bg-secondary/20">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('شرح مبسط وواضح', 'Clear & Simple Logic')}</h3>
                            <p className="text-muted-foreground text-sm">{t('تبسيط المنهج وتحويله إلى معلومات سهلة الفهم والاستيعاب للمستويات كافة.', 'Simplifying the curriculum into easy-to-understand concepts for all levels.')}</p>
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-start p-6 rounded-2xl bg-secondary/10 border border-border/50 transition-colors hover:bg-secondary/20">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                                <BookOpen className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('محتوى منظم', 'Organized Content')}</h3>
                            <p className="text-muted-foreground text-sm">{t('تسلسل منطقي ومبني حسب متطلبات المراحل الأكاديمية المختلفة لضمان أقصى استفادة.', 'Logical sequencing based on academic stage requirements to ensure maximum benefit.')}</p>
                        </div>
                        <div className="flex flex-col items-center md:items-start text-center md:text-start p-6 rounded-2xl bg-secondary/10 border border-border/50 transition-colors hover:bg-secondary/20">
                            <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-4">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <h3 className="text-xl font-bold mb-2">{t('متابعة مستمرة', 'Continuous Mentorship')}</h3>
                            <p className="text-muted-foreground text-sm">{t('توجيه مباشر وحرص تام على بناء المعرفة ومتابعة مستويات الطلاب بشكل دروي.', 'Direct guidance and keen interest in building knowledge and tracking student progress.')}</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* 6) TEACHER BIO */}
            <section className="py-16 bg-secondary/5 border-y border-border/50">
                <div className="container-academic max-w-4xl mx-auto">
                    <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center md:text-start">
                        {t('عن المعلم', 'About the Teacher')}
                    </h2>
                    <div className="prose prose-lg prose-invert max-w-none text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {t(
                            profile.bio_ar || 'لا يوجد تفاصيل إضافية عن المعلم في الوقت الحالي.',
                            profile.bio_en || profile.bio_ar || 'No additional details available for this teacher at this time.'
                        )}
                    </div>
                    {/* Expertise Tags */}
                    {profile.expertise_tags_ar && (profile.expertise_tags_ar as string[]).length > 0 && (
                        <div className="mt-8">
                            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-4">
                                {t('مجالات التخصص', 'Areas of Expertise')}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                                {(profile.expertise_tags_ar as string[]).map((tag: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="bg-primary/5 text-primary border border-primary/20 px-4 py-1.5 text-sm rounded-full">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </section>

            {/* 3) SUBJECTS AND STAGES */}
            {stages.length > 0 && (
                <section className="py-12 bg-background">
                    <div className="container-academic max-w-6xl">
                        <h2 className="text-2xl font-bold text-foreground mb-6">
                            {t('المراحل الدراسية', 'Educational Stages')}
                        </h2>
                        <div className="flex flex-wrap gap-3">
                            {stages.map((stage: any) => (
                                <div key={stage.id} className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-secondary/20 border border-border text-foreground font-medium">
                                    <GraduationCap className="w-5 h-5 text-primary" />
                                    {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 4) FEATURED COURSES SECTION */}
            {courses.length > 0 && (
                <section id="courses" className="py-16 bg-secondary/10 border-t border-border/50">
                    <div className="container-academic max-w-6xl">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                                    {t('الدورات والمواد المتاحة', 'Available Courses & Subjects')}
                                </h2>
                                <p className="text-muted-foreground">
                                    {t('اكتشف الدورات التي يقدمها هذا المعلم', 'Discover the courses offered by this teacher')}
                                </p>
                            </div>
                        </div>
                        
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {courses.map((course: any) => (
                                <div key={course.id} className="academic-card group bg-background/50 overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-xl transition-all duration-300 border border-border/60 rounded-2xl">
                                    <div className="p-6 flex-1 flex flex-col">
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                                                <BookOpen className="w-6 h-6 text-primary" />
                                            </div>
                                            {course.stage && (
                                                <Badge variant="outline" className="bg-background text-xs text-muted-foreground border-border">
                                                    {t(course.stage.title_ar, course.stage.title_en || course.stage.title_ar)}
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="text-xl font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                                            {t(course.title_ar, course.title_en || course.title_ar)}
                                        </h3>
                                        <p className="text-sm text-muted-foreground line-clamp-2 mb-6 flex-1">
                                            {t(course.description_ar || course.teaser_ar, course.description_en || course.teaser_en || course.description_ar || course.teaser_ar)}
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-4 text-sm border-t border-border pt-4 mt-auto">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                                    <Video className="w-3.5 h-3.5" /> {t('الدروس', 'Lessons')}
                                                </span>
                                                <span className="font-semibold">{course.lessons_count}</span>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-muted-foreground text-xs flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {t('المدة تقريباً', 'Est. Time')}
                                                </span>
                                                <span className="font-semibold flex items-center gap-1">
                                                    {Math.ceil(course.total_duration_seconds / 3600)} {t('ساعات', 'Hours')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-secondary/30 p-4 border-t border-border flex gap-3">
                                        <Link to={`/subject/${course.id}`} className="flex-1">
                                            <Button className="w-full text-foreground/90 font-medium shadow-md transition-colors hover:text-primary-foreground border border-border hover:border-transparent">
                                                {t('عرض الدورة', 'View Course')}
                                                <ChevronIcon className="w-4 h-4 ms-2" />
                                            </Button>
                                        </Link>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 5) STUDENT REVIEWS */}
            {reviews.length > 0 && (
                <section className="py-20 bg-background border-t border-border/50 overflow-hidden relative">
                    {/* Decorative blob */}
                    <div className="absolute top-0 end-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    
                    <div className="container-academic max-w-6xl relative z-10">
                        <div className="text-center md:text-start mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h2 className="text-3xl font-bold text-foreground mb-3">
                                    {t('آراء وتجارب الطلاب', 'Student Reviews')}
                                </h2>
                                <p className="text-muted-foreground">
                                    {t('اقرأ ما يكتبه الطلاب عن تجربة التعلم مع هذا المعلم', 'Read what students say about learning with this teacher')}
                                </p>
                            </div>
                            <div className="flex items-center gap-4 bg-secondary/30 px-6 py-3 rounded-2xl border border-border">
                                <span className="text-4xl font-black text-foreground">{stats.averageRating}</span>
                                <div className="flex flex-col items-start gap-1">
                                    <div className="flex text-amber-500">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-4 h-4 ${i < Math.round(stats.averageRating) ? 'fill-amber-500' : 'fill-muted text-muted'}`} />
                                        ))}
                                    </div>
                                    <span className="text-xs text-muted-foreground font-medium">
                                        {t('متوسط تقييمات الدورات', 'Average Course Rating')}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {reviews.map((review: any) => (
                                <div key={review.id} className="bg-secondary/10 p-6 rounded-2xl border border-border/50 flex flex-col relative">
                                    <Quote className="absolute top-6 end-6 w-8 h-8 text-primary/10" />
                                    <div className="flex items-center gap-1 text-amber-500 mb-4">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-amber-500' : 'fill-muted text-muted'}`} />
                                        ))}
                                    </div>
                                    <p className="text-foreground leading-relaxed italic mb-6 flex-1 text-sm md:text-base">
                                        "{review.comment}"
                                    </p>
                                    <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                                        <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold overflow-hidden shrink-0">
                                            {review.user?.avatar_url ? (
                                                <img src={review.user.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                review.user?.full_name?.charAt(0) || 'S'
                                            )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-semibold text-sm truncate">
                                                {/* Show first name only for privacy if possible, or full if fallback */}
                                                {review.user?.full_name?.split(' ')[0] || t('طالب مجتهد', 'Student')}
                                            </span>
                                            {review.lesson && (
                                                <span className="text-xs text-muted-foreground truncate">
                                                    {t(review.lesson.title_ar, review.lesson.title_en || review.lesson.title_ar)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* 8) BOTTOM CTA */}
            <section className="py-24 bg-primary text-white relative overflow-hidden">
                <div className="absolute inset-0 bg-grid-white/10 opacity-10" />
                <div className="absolute top-0 right-1/4 w-96 h-96 bg-white/10 blur-3xl rounded-full" />
                <div className="container-academic relative z-10 text-center max-w-3xl mx-auto px-4">
                    <h2 className="text-3xl md:text-5xl font-black mb-6 leading-tight">
                        {t('ابدأ رحلتك التعليمية مع هذا المعلم', 'Start Your Educational Journey with this Teacher')}
                    </h2>
                    <p className="text-white/80 md:text-lg mb-10 max-w-xl mx-auto">
                        {t('انضم إلى مئات الطلاب الذين حققوا التميز بفضل الشرح الواضح والمتابعة المستمرة. احجز مقعدك الآن وابدأ التعلم.', 'Join hundreds of students who achieved excellence thanks to clear explanations and continuous follow-up. Enroll now and start learning.')}
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <Link to="/register">
                            <Button size="lg" className="w-full sm:w-auto rounded-full px-10 h-14 text-base font-bold bg-white text-primary hover:bg-white/90 transition-colors border-0 duration-300 shadow-xl shadow-black/20">
                                {t('سجل الآن', 'Register Now')}
                            </Button>
                        </Link>
                        <Button onClick={scrollToCourses} size="lg" variant="outline" className="w-full sm:w-auto rounded-full px-10 h-14 text-base font-medium border-white/30 hover:bg-white/10 text-white transition-colors duration-300 border">
                            {t('استعرض جميع الدورات', 'Browse All Courses')}
                        </Button>
                    </div>
                </div>
            </section>
        </Layout>
    );
}
