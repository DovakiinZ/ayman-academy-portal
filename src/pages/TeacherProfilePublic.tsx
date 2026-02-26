import { useParams, Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTeacherProfile, useTeacherPublicSubjects } from '@/hooks/useQueryHooks';
import { User, ChevronLeft, ChevronRight, BookOpen, GraduationCap, MapPin, FileText } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

export default function TeacherProfilePublic() {
    const { id } = useParams();
    const { t, direction } = useLanguage();
    const { data: teacher, isLoading, error } = useTeacherProfile(id);
    const { data: subjects = [], isLoading: subjectsLoading } = useTeacherPublicSubjects(id);

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

    if (isLoading) {
        return (
            <Layout>
                <div className="container-academic py-20">
                    <div className="max-w-4xl mx-auto space-y-8">
                        <div className="flex flex-col md:flex-row gap-8 items-start">
                            <Skeleton className="w-32 h-32 rounded-full flex-shrink-0" />
                            <div className="flex-1 space-y-4 w-full">
                                <Skeleton className="h-10 w-1/3" />
                                <Skeleton className="h-6 w-1/2" />
                                <div className="space-y-2 pt-4">
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-2/3" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    if (error || !teacher) {
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

    return (
        <Layout>
            <div className="container-academic py-12 md:py-20">
                <div className="max-w-4xl mx-auto">
                    {/* Header Section */}
                    <div className="flex flex-col md:flex-row gap-8 items-start mb-12">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full bg-secondary flex-shrink-0 overflow-hidden border-2 border-primary/20 shadow-xl">
                            {teacher.avatar_url ? (
                                <img
                                    src={teacher.avatar_url}
                                    alt={teacher.full_name || ''}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                    <User className="w-16 h-16 text-muted-foreground" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 space-y-4">
                            <div>
                                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                                    {teacher.full_name}
                                </h1>
                                <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
                                    <span className="flex items-center gap-1.5">
                                        <GraduationCap className="w-4 h-4" />
                                        {t('معلم معتمد', 'Certified Instructor')}
                                    </span>
                                    {teacher.expertise_tags_ar && (teacher.expertise_tags_ar as string[]).length > 0 && (
                                        <div className="flex gap-2">
                                            {(teacher.expertise_tags_ar as string[]).map((tag, i) => (
                                                <Badge key={i} variant="secondary" className="bg-primary/10 text-primary border-none">
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="prose prose-invert max-w-none">
                                <p className="text-lg text-muted-foreground leading-relaxed">
                                    {t(teacher.bio_ar || '', teacher.bio_en || teacher.bio_ar || '')}
                                </p>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <a href="#subjects">
                                    <Button className="rounded-full px-8">
                                        {t('استكشف الدروس', 'Explore Lessons')}
                                        <ChevronIcon className="w-4 h-4 ms-2" />
                                    </Button>
                                </a>
                                <Link to="/register">
                                    <Button variant="outline" className="rounded-full px-8">
                                        {t('سجل الآن', 'Register Now')}
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* About Section */}
                    <div className="grid md:grid-cols-3 gap-8 border-t border-border pt-12">
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground mb-4">
                                    {t('نبذة تعريفية', 'About Me')}
                                </h2>
                                <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                    {t(
                                        teacher.bio_ar || 'لا يوجد وصف متاح.',
                                        teacher.bio_en || teacher.bio_ar || 'No description available.'
                                    )}
                                </p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="academic-card p-6 bg-secondary/20">
                                <h3 className="font-semibold text-foreground mb-4">
                                    {t('المعلومات الأكاديمية', 'Academic Info')}
                                </h3>
                                <div className="space-y-4 text-sm">
                                    <div className="flex justify-between py-2 border-b border-border">
                                        <span className="text-muted-foreground">{t('الدور', 'Role')}</span>
                                        <span className="text-foreground font-medium">{t('معلم', 'Teacher')}</span>
                                    </div>
                                    <div className="flex justify-between py-2 border-b border-border">
                                        <span className="text-muted-foreground">{t('الحالة', 'Status')}</span>
                                        <span className="text-emerald-500 font-medium">{t('نشط', 'Active')}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Subjects Section */}
                {subjects.length > 0 && (
                    <div id="subjects" className="mt-16 pt-12 border-t border-border">
                        <h2 className="text-2xl font-bold text-foreground mb-8">
                            {t('مواد المعلم', 'Teacher\'s Subjects')}
                        </h2>
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {subjects.map((subject: any) => (
                                <Link
                                    key={subject.id}
                                    to={`/subject/${subject.id}`}
                                    className="academic-card group hover:border-primary/30 transition-colors bg-secondary/10 p-5 rounded-xl border border-border flex flex-col"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                                        <BookOpen className="w-6 h-6 text-primary" />
                                    </div>
                                    {subject.stage && (
                                        <span className="inline-block px-2 py-0.5 bg-secondary text-[10px] text-muted-foreground rounded mb-2 w-fit">
                                            {t(subject.stage.title_ar, subject.stage.title_en || subject.stage.title_ar)}
                                        </span>
                                    )}
                                    <h3 className="text-base font-medium text-foreground mb-2">
                                        {t(subject.title_ar, subject.title_en || subject.title_ar)}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {t(subject.teaser_ar, subject.teaser_en || subject.teaser_ar)}
                                    </p>
                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-auto pt-4 border-t border-border">
                                        <FileText className="w-3.5 h-3.5" />
                                        <span>
                                            {subject.lessons_count} {t('درس', 'lessons')}
                                        </span>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
