import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHomeStages } from '@/hooks/useQueryHooks';
import { GraduationCap, BookOpen, School, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

const getIconForStage = (slug: string) => {
  switch (slug) {
    case 'kindergarten':
      return GraduationCap;
    case 'primary':
      return BookOpen;
    case 'middle':
      return School;
    default:
      return School;
  }
};

const StagesSection = () => {
  const { t, direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;
  const { data: stages = [], isLoading: loading } = useHomeStages();

  if (loading) {
    return (
      <section className="section-academic">
        <div className="container-academic">
          <div className="flex justify-center items-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  if (stages.length === 0) {
    return null;
  }

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
          {stages.map((stage: any) => {
            const Icon = getIconForStage(stage.slug);
            const description = stage.teaser_ar || stage.description_ar;
            const descriptionEn = stage.teaser_en || stage.description_en || description;

            return (
              <Link
                key={stage.id}
                to={`/stages/${stage.id}`}
                className="academic-card group hover:border-primary/20 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary/8 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">
                  {t(stage.title_ar, stage.title_en || stage.title_ar)}
                </h3>
                <p className="text-muted-foreground text-sm mb-4">
                  {t(description, descriptionEn)}
                </p>
                <div className="flex items-center justify-between">
                  <span className="badge-stage">
                    {t('المواد', 'Subjects')}
                  </span>
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
