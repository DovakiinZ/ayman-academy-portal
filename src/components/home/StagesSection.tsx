import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Stage } from '@/types/database';
import { GraduationCap, BookOpen, School, ArrowLeft, ArrowRight, Layers } from 'lucide-react';

// Icon pool — cycles if more than 4 stages
const stageIcons = [GraduationCap, BookOpen, School, Layers];

const StagesSection = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    try {
      const { data, error } = await supabase
        .from('stages')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        console.error('Error fetching stages:', error);
        setStages([]);
      } else {
        setStages(data || []);
      }
    } catch (err) {
      console.error('Stages fetch error:', err);
      setStages([]);
    } finally {
      setLoading(false);
    }
  };

  // Hide section if loading or no data
  if (loading) {
    return (
      <section className="section-academic">
        <div className="container-academic">
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </section>
    );
  }

  if (stages.length === 0) return null;

  return (
    <section className="section-academic">
      <div className="container-academic">
        <div className="text-center mb-10">
          <h2 className="text-foreground mb-3">
            {t('المراحل الدراسية', 'Educational Stages')}
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            {t(
              'منهج تعليمي متكامل يغطي جميع المراحل التأسيسية',
              'A comprehensive curriculum covering all foundational stages'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {stages.map((stage, index) => {
            const IconComponent = stageIcons[index % stageIcons.length];
            return (
              <Link
                key={stage.id}
                to={`/stages/${stage.slug || stage.id}`}
                className="academic-card group hover:border-primary/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-4">
                  <IconComponent className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t(stage.title_ar, stage.title_en || stage.title_ar)}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t(stage.description_ar || '', stage.description_en || stage.description_ar || '')}
                </p>
                <div className="flex items-center justify-end">
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1">
                    {t('عرض المواد', 'View Subjects')}
                    <ArrowIcon className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default StagesSection;
