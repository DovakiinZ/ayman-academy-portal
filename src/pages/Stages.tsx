import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTemplate } from '@/hooks/useTemplate';
import { useStages } from '@/hooks/useQueryHooks';
import Layout from '@/components/layout/Layout';
import { GraduationCap, BookOpen, School, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';

const Stages = () => {
  const { t, direction } = useLanguage();
  const { data: stages = [], isLoading, error } = useStages();

  // Dynamic text
  const pageTitle = useTemplate(
    'stages.page.title',
    'المراحل الدراسية',
    'Educational Stages'
  );

  const pageSubtitle = useTemplate(
    'stages.page.subtitle',
    'اختر المرحلة الدراسية المناسبة للوصول إلى المواد والدروس التعليمية',
    'Select the appropriate educational stage to access subjects and lessons'
  );

  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  // Icon mapping helper
  const getStageIcon = (slug: string = '', titleAr: string = '') => {
    if (slug.includes('kindergarten') || titleAr.includes('تمهيدي')) return GraduationCap;
    if (slug.includes('primary') || titleAr.includes('ابتدائي')) return BookOpen;
    if (slug.includes('middle') || titleAr.includes('متوسط')) return School;
    return BookOpen;
  };

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <h1 className="text-foreground mb-4">
            {pageTitle}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {pageSubtitle}
          </p>
        </div>
      </section>

      {/* Stages Grid */}
      <section className="section-academic">
        <div className="container-academic">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('جاري تحميل المراحل...', 'Loading stages...')}</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center">
              <p className="text-destructive font-medium">{t('حدث خطأ أثناء تحميل المراحل', 'Error loading stages')}</p>
              <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : String(error)}</p>
            </div>
          ) : stages.length === 0 ? (
            <div className="text-center py-20 bg-secondary/10 rounded-xl border-2 border-dashed border-border">
              <GraduationCap className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-lg font-medium text-foreground">{t('لا توجد مراحل دراسية حالياً', 'No educational stages found')}</h3>
              <p className="text-muted-foreground mt-2">{t('يرجى مراجعة الإدارة لإضافة مراحل جديدة', 'Please contact admin to add new stages')}</p>
            </div>
          ) : (
            <div className="space-y-6">
              {stages.map((stage: any) => {
                const Icon = getStageIcon(stage.slug, stage.title_ar);
                return (
                  <Link
                    key={stage.id}
                    to={`/stages/${stage.id}`}
                    className="academic-card flex flex-col md:flex-row md:items-center gap-6 hover:shadow-md transition-all group"
                  >
                    <div className="w-16 h-16 rounded bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        {t(stage.title_ar, stage.title_en || stage.title_ar)}
                      </h2>
                      <p className="text-muted-foreground text-sm mb-4 leading-relaxed">
                        {t(stage.description_ar, stage.description_en || stage.description_ar) ||
                          t('لا يوجد وصف متاح لهذه المرحلة', 'No description available for this stage')}
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <span className="badge-stage">
                          {t(`${stage.subjects_count || 0} مواد`, `${stage.subjects_count || 0} Subjects`)}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:flex items-center text-primary">
                      <ArrowIcon className="w-5 h-5" />
                    </div>
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

export default Stages;
