import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';
import { supabase } from '@/lib/supabase';
import { Calculator, BookOpen, Beaker, Globe, Palette, Music, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

// Icon mapping helper
const getSubjectIcon = (title: string) => {
  const t = title.toLowerCase();
  if (t.includes('عربي') || t.includes('arabic')) return BookOpen;
  if (t.includes('رياضيات') || t.includes('math')) return Calculator;
  if (t.includes('علوم') || t.includes('science')) return Beaker;
  if (t.includes('انجليزي') || t.includes('english')) return Globe;
  if (t.includes('فنون') || t.includes('art')) return Palette;
  if (t.includes('موسيقى') || t.includes('music')) return Music;
  return BookOpen;
};

const StageDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const BackIcon = direction === 'rtl' ? ChevronRight : ChevronLeft;

  const [stage, setStage] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStageData = async () => {
      if (!slug) return;
      setLoading(true);
      setError(null);

      try {
        // Fetch stage by slug or ID fallback
        let { data: stageData, error: stageError } = await supabase
          .from('stages')
          .select('*')
          .eq('slug', slug)
          .maybeSingle();

        // Fallback to ID if not found by slug (handles un-migrated stages)
        if (!stageData && slug && slug.length > 20) {
          const { data: idData, error: idError } = await supabase
            .from('stages')
            .select('*')
            .eq('id', slug)
            .maybeSingle();
          stageData = idData;
          stageError = idError;
        }

        if (stageError || !stageData) {
          console.error('Stage fetch error:', stageError || 'No data');
          setError(stageError?.message || 'Stage not found');
          return;
        }

        setStage(stageData);

        // Fetch subjects for this stage
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .eq('stage_id', (stageData as any).id)
          .eq('is_active', true)
          .order('sort_order', { ascending: true });

        if (subjectsError) {
          console.error('Subjects fetch error:', subjectsError);
        } else {
          setSubjects(subjectsData || []);
        }
      } catch (err: any) {
        console.error('Unexpected error:', err);
        setError(err.message || 'An unexpected error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchStageData();
  }, [slug]);

  if (loading) {
    return (
      <Layout>
        <div className="container-academic py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (error || !stage) {
    return (
      <Layout>
        <div className="container-academic py-20 text-center">
          <h1 className="text-2xl font-bold mb-4">{t('المرحلة غير موجودة', 'Stage Not Found')}</h1>
          <Link to="/stages" className="text-primary hover:underline">
            {t('العودة لجميع المراحل', 'Back to all stages')}
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <Link
            to="/stages"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors"
          >
            <BackIcon className="w-4 h-4" />
            {t('جميع المراحل', 'All Stages')}
          </Link>
          <h1 className="text-foreground mb-4">
            {t(stage.title_ar, stage.title_en || stage.title_ar)}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {t(
              stage.description_ar || 'اختر المادة الدراسية للوصول إلى الدروس والمحتوى التعليمي',
              stage.description_en || stage.description_ar || 'Select a subject to access lessons and educational content'
            )}
          </p>
        </div>
      </section>

      {/* Subjects Grid */}
      <section className="section-academic">
        <div className="container-academic">
          {subjects.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              {t('لا توجد مواد دراسية متوفرة حالياً لهذه المرحلة', 'No subjects available for this stage yet')}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subjects.map((subject) => {
                const Icon = getSubjectIcon(subject.title_en || subject.title_ar);
                return (
                  <Link
                    key={subject.id}
                    to={`/stages/${slug}/${subject.id}`}
                    className="academic-card hover:shadow-md transition-all group"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <ArrowIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {t(subject.title_ar, subject.title_en || subject.title_ar)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {t('عرض الدروس', 'View Lessons')}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </Layout>
  );
};

export default StageDetail;
