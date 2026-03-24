import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { useAllTeachers } from '@/hooks/useQueryHooks';
import { Button } from '@/components/ui/button';
import { Loader2, Facebook, Twitter, Linkedin, Instagram, Globe, BookOpen, GraduationCap, Briefcase, Users } from 'lucide-react';

const Instructors = () => {
    const { t } = useLanguage();
    const { data: instructors, isLoading, error } = useAllTeachers();

    const getSocialIcon = (platform: string) => {
        switch (platform.toLowerCase()) {
            case 'facebook': return <Facebook className="w-4 h-4" />;
            case 'twitter':
            case 'x': return <Twitter className="w-4 h-4" />;
            case 'linkedin': return <Linkedin className="w-4 h-4" />;
            case 'instagram': return <Instagram className="w-4 h-4" />;
            default: return <Globe className="w-4 h-4" />;
        }
    };

    return (
        <Layout>
            {/* Header */}
            <section className="bg-secondary/30 py-10 md:py-12 border-b border-border">
                <div className="container-academic">
                    <h1 className="text-3xl font-bold text-foreground mb-3">
                        {t('الهيئة التعليمية', 'Faculty')}
                    </h1>
                    <p className="text-muted-foreground text-base max-w-xl">
                        {t(
                            'نخبة من المعلمين المتخصصين ذوي الخبرة الأكاديمية العالية والمؤهلات المتميزة',
                            'A select group of specialized educators with extensive academic experience and distinguished qualifications'
                        )}
                    </p>
                </div>
            </section>

            {/* Instructors Grid */}
            <section className="py-12 md:py-16">
                <div className="container-academic">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                            <p className="text-muted-foreground">{t('جاري تحميل المعلمين...', 'Loading faculty...')}</p>
                        </div>
                    ) : error ? (
                        <div className="bg-destructive/10 border border-destructive/20 p-6 rounded-lg text-center">
                            <p className="text-destructive font-medium">{t('فشل تحميل البيانات', 'Failed to load faculty')}</p>
                        </div>
                    ) : instructors && instructors.length > 0 ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {instructors.map((instructor: any) => (
                                <div key={instructor.id} className="academic-card h-full flex flex-col p-6 hover:shadow-lg transition-shadow border border-border bg-card rounded-xl">
                                    <div className="flex items-start gap-4 mb-5">
                                        <div className="relative shrink-0">
                                            {instructor.avatar_url ? (
                                                <img
                                                    src={instructor.avatar_url}
                                                    alt={instructor.full_name}
                                                    className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/10"
                                                />
                                            ) : (
                                                <div className="w-20 h-20 rounded-2xl bg-primary/5 flex items-center justify-center border-2 border-primary/10">
                                                    <Users className="w-10 h-10 text-primary/20" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-lg font-bold text-foreground mb-1 leading-tight">
                                                {instructor.full_name}
                                            </h3>
                                            {instructor.qualifications && (
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
                                                    <GraduationCap className="w-3.5 h-3.5 text-primary/60" />
                                                    <span className="line-clamp-1">{instructor.qualifications}</span>
                                                </div>
                                            )}
                                            
                                            {/* Social Links Mini Bar */}
                                            {instructor.social_links && Object.values(instructor.social_links).some(v => !!v) && (
                                                <div className="flex items-center gap-2 mt-2">
                                                    {Object.entries(instructor.social_links).map(([platform, url]) => (
                                                        url && (
                                                            <a 
                                                                key={platform}
                                                                href={url as string} 
                                                                target="_blank" 
                                                                rel="noopener noreferrer"
                                                                className="text-muted-foreground hover:text-primary transition-colors p-1 bg-secondary/50 rounded-md"
                                                                title={platform}
                                                            >
                                                                {getSocialIcon(platform)}
                                                            </a>
                                                        )
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-4 flex-1">
                                        {(t(instructor.bio_ar, instructor.bio_en)) && (
                                            <div className="relative">
                                                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed italic">
                                                    "{t(instructor.bio_ar, instructor.bio_en)}"
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between">
                                        <Button variant="outline" size="sm" asChild className="w-full text-xs font-semibold">
                                            <Link to={`/t/${instructor.id}`}>
                                                {t('عرض الملف الشخصي', 'View Profile')}
                                            </Link>
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-secondary/10 rounded-2xl border border-dashed border-border">
                            <p className="text-muted-foreground">{t('لا يوجد معلمين حالياً', 'No faculty members found at the moment.')}</p>
                        </div>
                    )}
                </div>
            </section>
        </Layout>
    );
};

export default Instructors;
