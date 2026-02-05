/**
 * FeaturedTeachersSection - Displays featured teachers on homepage
 * Admin-controlled via show_on_home and home_order fields
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types/database';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function FeaturedTeachersSection() {
    const { t, direction } = useLanguage();
    const [teachers, setTeachers] = useState<Partial<Profile>[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchFeaturedTeachers();
    }, []);

    const fetchFeaturedTeachers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio_ar, bio_en')
            .eq('role', 'teacher')
            .eq('is_active', true)
            .eq('show_on_home', true)
            .order('home_order', { ascending: true })
            .limit(6);

        if (error || !data) {
            setTeachers([]);
        } else {
            setTeachers(data);
        }
        setLoading(false);
    };

    const ChevronIcon = direction === 'rtl' ? ChevronLeft : ChevronRight;

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
                        {t('المعلمون', 'Faculty')}
                    </h2>
                    <p className="text-muted-foreground text-sm max-w-lg mx-auto">
                        {t(
                            'نخبة من المعلمين المتخصصين ذوي الخبرة الأكاديمية',
                            'A select group of specialized educators with academic experience'
                        )}
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {teachers.map((teacher) => (
                        <div key={teacher.id} className="academic-card">
                            <div className="flex items-start gap-4">
                                {/* Avatar */}
                                <div className="w-16 h-16 rounded-full bg-secondary flex-shrink-0 overflow-hidden border border-border">
                                    {teacher.avatar_url ? (
                                        <img
                                            src={teacher.avatar_url}
                                            alt={teacher.full_name || ''}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-6 h-6 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-base font-medium text-foreground mb-1 truncate">
                                        {teacher.full_name || t('معلم', 'Teacher')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                                        {t(teacher.bio_ar || '', teacher.bio_en || teacher.bio_ar || '')}
                                    </p>
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="mt-4 pt-4 border-t border-border">
                                <Link to={`/teacher/${teacher.id}`}>
                                    <Button variant="ghost" size="sm" className="w-full justify-between">
                                        {t('عرض الملف', 'View Profile')}
                                        <ChevronIcon className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-8">
                    <Link
                        to="/stages"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('تعرف على جميع المعلمين', 'Meet All Instructors')}
                    </Link>
                </div>
            </div>
        </section>
    );
}
