import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { Loader2, User, BookOpen, GraduationCap, Clock } from 'lucide-react';
import { Profile } from '@/types/database';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function Instructors() {
  const { t, direction } = useLanguage();
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [stagesMap, setStagesMap] = useState<Record<string, any>>({});

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      try {
        // Fetch stages for mapping
        const { data: stagesData } = await supabase
          .from('stages')
          .select('id, title_ar, title_en');

        if (stagesData) {
          const map: Record<string, any> = {};
          stagesData.forEach(s => map[s.id] = s);
          setStagesMap(map);
        }

        // Fetch teachers
        const { data: profiles, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('role', 'teacher')
          .eq('is_active', true)
          .order('full_name', { ascending: true });

        if (profiles) {
          // Fetch lesson counts for each teacher
          const teachersWithCounts = await Promise.all(profiles.map(async (p) => {
            const { count } = await supabase
              .from('lessons')
              .select('*', { count: 'exact', head: true })
              .eq('created_by', p.id)
              .eq('is_published', true);

            return { ...p, lessonCount: count || 0 };
          }));

          setTeachers(teachersWithCounts);
        }
      } catch (err) {
        console.error('Error fetching instructors:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-10 md:py-12 border-b border-border">
        <div className="container-academic">
          <h1 className="text-foreground mb-3 font-bold text-3xl">
            {t('الهيئة التعليمية', 'Faculty')}
          </h1>
          <p className="text-muted-foreground text-sm max-w-xl">
            {t(
              'نخبة من المعلمين المتخصصين ذوي الخبرة الأكاديمية العالية والمؤهلات المتميزة',
              'A select group of specialized educators with extensive academic experience and distinguished qualifications'
            )}
          </p>
        </div>
      </section>

      {/* Instructors Grid */}
      <section className="section-academic min-h-[50vh]">
        <div className="container-academic">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">{t('جاري تحميل قائمة المعلمين...', 'Loading faculty list...')}</p>
            </div>
          ) : teachers.length === 0 ? (
            <div className="text-center py-20 bg-secondary/10 rounded-xl border border-dashed border-border">
              <User className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">{t('لا يوجد معلمون حالياً', 'No instructors found')}</h3>
              <p className="text-muted-foreground">{t('يرجى العودة لاحقاً', 'Please check back later')}</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {teachers.map((teacher) => (
                <div key={teacher.id} className="academic-card flex flex-col h-full group hover:shadow-md transition-all border border-border">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-20 h-20 rounded-xl bg-secondary flex-shrink-0 overflow-hidden border border-border group-hover:border-primary/30 transition-colors">
                      {teacher.avatar_url ? (
                        <img
                          src={teacher.avatar_url}
                          alt={teacher.full_name || ''}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-8 h-8 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-lg font-bold text-foreground mb-1 mt-1 truncate">
                        {teacher.full_name || t('معلم', 'Teacher')}
                      </h3>

                      {/* Expertise Tags */}
                      {teacher.expertise_tags_ar && teacher.expertise_tags_ar.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-2">
                          {teacher.expertise_tags_ar.slice(0, 2).map((tag: string) => (
                            <span key={tag} className="text-[10px] text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">
                              {tag}
                            </span>
                          ))}
                          {teacher.expertise_tags_ar.length > 2 && (
                            <span className="text-[10px] text-muted-foreground">+{teacher.expertise_tags_ar.length - 2}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-6 italic leading-relaxed">
                      {t(teacher.bio_ar || '', teacher.bio_en || teacher.bio_ar || '')}
                    </p>
                  </div>

                  <div className="pt-4 border-t border-border mt-auto space-y-4">
                    {/* Stages */}
                    {teacher.featured_stages && teacher.featured_stages.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {teacher.featured_stages.map((stageId: string) => {
                          const stage = stagesMap[stageId];
                          if (!stage) return null;
                          return (
                            <span
                              key={stageId}
                              className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-medium bg-secondary text-secondary-foreground border border-border"
                            >
                              {t(stage.title_ar, stage.title_en || stage.title_ar)}
                            </span>
                          );
                        })}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <BookOpen className="w-3.5 h-3.5 text-primary/60" />
                        <span>{t(`${teacher.lessonCount} درساً بالمنصة`, `${teacher.lessonCount} Lessons on platform`)}</span>
                      </div>

                      <Link to={`/teacher/${teacher.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 group/btn">
                          {t('الملف الكامل', 'View Profile')}
                          < GraduationCap className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
}
