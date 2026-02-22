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


import SectionTitle from '@/components/ui/SectionTitle';

export default function FeaturedTeachersSection() {
    const { t, direction } = useLanguage();
    const [teachers, setTeachers] = useState<Partial<Profile>[]>([]);
    const [stagesMap, setStagesMap] = useState<Record<string, any>>({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const init = async () => {
            await fetchStages();
            await fetchFeaturedTeachers();
        };
        init();
    }, []);

    const fetchStages = async () => {
        const { data, error } = await supabase
            .from('stages')
            .select('id, title_ar, title_en');

        if (!error && data) {
            const map: Record<string, any> = {};
            data.forEach((s: any) => {
                map[s.id] = s;
            });
            setStagesMap(map);
        }
    };

    const fetchFeaturedTeachers = async () => {
        const { data, error } = await supabase
            .from('profiles')
            .select('id, full_name, avatar_url, bio_ar, bio_en, featured_stages')
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
            <section className="py-24 transition-colors">
                <div className="container-academic">
                    <div className="flex items-center justify-center h-48 text-primary">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="py-24 transition-colors">
            <div className="container-academic">
                <SectionTitle
                    title={t('نخبة المعلمين', 'Our Faculty')}
                    subtitle={t(
                        'نخبة من المعلمين المتخصصين ذوي الخبرة الأكاديمية العالية',
                        'A select group of specialized educators with deep academic experience'
                    )}
                    align="center"
                />

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {teachers.map((teacher) => (
                        <div key={teacher.id} className="premium-card p-6 flex flex-col group">
                            <div className="flex items-start gap-5">
                                {/* Avatar */}
                                <div className="w-20 h-20 rounded-full bg-slate-100 flex-shrink-0 overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-900/5">
                                    {teacher.avatar_url ? (
                                        <img
                                            src={teacher.avatar_url}
                                            alt={teacher.full_name || ''}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center">
                                            <User className="w-8 h-8 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 pt-1">
                                    <h3 className="text-lg font-bold text-foreground mb-1 truncate leading-none">
                                        {teacher.full_name || t('معلم', 'Teacher')}
                                    </h3>
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                                        {t(teacher.bio_ar || '', teacher.bio_en || teacher.bio_ar || '')}
                                    </p>

                                    {/* Assigned Stages */}
                                    {teacher.featured_stages && teacher.featured_stages.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-auto">
                                            {teacher.featured_stages.map((stageId) => {
                                                const stage = stagesMap[stageId];
                                                if (!stage) return null;
                                                return (
                                                    <span
                                                        key={stageId}
                                                        className="badge-premium"
                                                    >
                                                        {t(stage.title_ar, stage.title_en || stage.title_ar)}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* CTA */}
                            <div className="mt-8 pt-6 border-t border-slate-900/[0.04]">
                                <Link to={`/teacher/${teacher.id}`}>
                                    <Button variant="outline" size="sm" className="w-full justify-between rounded-xl hover:bg-primary hover:text-white transition-all">
                                        {t('عرض الملف الأكاديمي', 'View Academic Profile')}
                                        <ChevronIcon className="w-4 h-4" />
                                    </Button>
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="text-center mt-12">
                    <Link
                        to="/instructors"
                        className="text-sm font-semibold text-muted-foreground hover:text-primary transition-colors flex items-center justify-center gap-1"
                    >
                        {t('تعرف على جميع المعلمين', 'Meet All Instructors')}
                        <ChevronIcon className="w-3.5 h-3.5" />
                    </Link>
                </div>
            </div>
        </section>
    );
}
