import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import type { Stage } from '@/types/database';
import { GraduationCap, BookOpen, School, ArrowLeft, ArrowRight, Layers } from 'lucide-react';

// Icon pool — cycles if more than 4 stages
const stageIcons = [GraduationCap, BookOpen, School, Layers];

import SectionTitle from '@/components/ui/SectionTitle';

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
      <section className="py-24">
        <div className="container-academic">
          <div className="flex items-center justify-center h-48 text-primary">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-current"></div>
          </div>
        </div>
      </section>
    );
  }

  if (stages.length === 0) return null;

  return (
    <section className="py-24 transition-colors">
      <div className="container-academic">
        <SectionTitle
          title={t('المراحل الدراسية', 'Educational Stages')}
          subtitle={t(
            'منهج تعليمي متكامل يغطي جميع المراحل التأسيسية من الابتدائي حتى الثانوي',
            'A comprehensive curriculum covering all foundational stages from primary to high school'
          )}
          align="center"
        />

        <div className="grid md:grid-cols-3 gap-6">
          {stages.map((stage, index) => {
            const IconComponent = stageIcons[index % stageIcons.length];
            return (
              <Link
                key={stage.id}
                to={`/stages/${stage.slug || stage.id}`}
                className="premium-card premium-card-accent p-8 flex flex-col group"
              >
                <div className="w-14 h-14 rounded-2xl bg-primary/[0.03] border border-primary/5 flex items-center justify-center mb-6 transition-colors group-hover:bg-primary/5">
                  <IconComponent className="w-7 h-7 text-primary/80" strokeWidth={1.5} />
                </div>

                <h3 className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors">
                  {t(stage.title_ar, stage.title_en || stage.title_ar)}
                </h3>

                <p className="text-muted-foreground text-sm leading-relaxed mb-6">
                  {t(stage.description_ar || '', stage.description_en || stage.description_ar || '')}
                </p>

                <div className="flex items-center justify-start mt-auto">
                  <span className="text-xs font-bold text-primary/70 group-hover:text-primary transition-colors flex items-center gap-1.5 uppercase tracking-wider">
                    {t('استكشف المواد', 'Explore Subjects')}
                    <ArrowIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1" />
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
