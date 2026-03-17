import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSubjects, useStages } from '@/hooks/useQueryHooks';
import Layout from '@/components/layout/Layout';
import { 
  BookOpen, Calculator, Beaker, Globe, Palette, Music, 
  Search, SlidersHorizontal, ArrowLeft, ArrowRight, Loader2,
  GraduationCap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function Subjects() {
  const { t, direction } = useLanguage();
  const { data: rawSubjects = [], isLoading: subjectsLoading, error } = useSubjects();
  const { data: stages = [], isLoading: stagesLoading } = useStages();
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  // Icon mapping helper (consistent with other pages)
  const getSubjectIcon = (titleAr: string = '') => {
    if (titleAr.includes('عرب')) return BookOpen;
    if (titleAr.includes('رياضيات') || titleAr.includes('حساب')) return Calculator;
    if (titleAr.includes('علوم') || titleAr.includes('فيزياء') || titleAr.includes('كيمياء')) return Beaker;
    if (titleAr.includes('انجليزي') || titleAr.includes('عالم') || titleAr.includes('اجتماع')) return Globe;
    if (titleAr.includes('فنون') || titleAr.includes('رسم')) return Palette;
    if (titleAr.includes('نشيد') || titleAr.includes('موسيقى')) return Music;
    return BookOpen;
  };

  const isLoading = subjectsLoading || stagesLoading;

  // Group and filter subjects
  const groupedSubjects = useMemo(() => {
    const filtered = rawSubjects.filter((s: any) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.title_ar.toLowerCase().includes(q) || 
        (s.title_en && s.title_en.toLowerCase().includes(q))
      );
    });

    const groups: Record<string, any[]> = {};
    
    // Sort stages by order first to ensure proper grouping order
    const sortedStages = [...stages].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    
    sortedStages.forEach(stage => {
      const stageSubjects = filtered.filter(s => s.stage_id === stage.id);
      if (stageSubjects.length > 0) {
        groups[stage.id] = stageSubjects;
      }
    });

    return {
      stages: sortedStages.filter(stage => groups[stage.id]),
      groups
    };
  }, [rawSubjects, stages, searchQuery]);

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-12 md:py-20 border-b border-border">
        <div className="container-academic">
          <div className="max-w-2xl">
            <h1 className="text-foreground mb-4">
              {t('كافة المواد الدراسية', 'All Subjects')}
            </h1>
            <p className="text-muted-foreground text-lg mb-8">
              {t(
                'تصفح كافة المواد التعليمية المتاحة عبر كافة المراحل الدراسية والتحق بما يناسب اهتماماتك',
                'Browse all educational subjects available across all stages and enroll in what suits your interests'
              )}
            </p>
            
            <div className="relative max-w-md">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder={t('ابحث عن مادة...', 'Search for a subject...')}
                className="ps-10 h-12 bg-background border-border"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="section-academic min-h-[40vh]">
        <div className="container-academic">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">{t('جاري تحميل المواد...', 'Loading subjects...')}</p>
            </div>
          ) : error ? (
            <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6 text-center max-w-xl mx-auto">
              <p className="text-destructive font-bold mb-2">{t('خطأ في تحميل البيانات', 'Error loading data')}</p>
              <p className="text-sm text-muted-foreground mb-4">
                {error instanceof Error ? error.message : String(error)}
              </p>
              <Button variant="outline" onClick={() => window.location.reload()}>
                {t('إعادة المحاولة', 'Retry')}
              </Button>
            </div>
          ) : groupedSubjects.stages.length === 0 ? (
            <div className="text-center py-20 bg-secondary/5 rounded-2xl border-2 border-dashed border-border">
              <BookOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-20" />
              <h3 className="text-xl font-semibold text-foreground">
                {searchQuery ? t('لا توجد نتائج بحث', 'No results found') : t('لا توجد مواد حالياً', 'No subjects found')}
              </h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery 
                  ? t('حاول البحث عن مادة أخرى أو مسح نص البحث', 'Try searching for another subject or clear the search text')
                  : t('سيتم إضافة المواد الدراسية قريباً', 'Subjects will be added soon')}
              </p>
              {searchQuery && (
                <Button 
                  variant="link" 
                  onClick={() => setSearchQuery('')}
                  className="mt-4"
                >
                  {t('مسح البحث', 'Clear Search')}
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-16">
              {groupedSubjects.stages.map((stage) => (
                <div key={stage.id}>
                  <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-foreground">
                      {t(stage.title_ar, stage.title_en || stage.title_ar)}
                    </h2>
                  </div>
                  
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedSubjects.groups[stage.id].map((subject) => {
                      const Icon = getSubjectIcon(subject.title_ar);
                      return (
                        <Link
                          key={subject.id}
                          to={`/stages/${stage.id}/${subject.id}`}
                          className="academic-card group hover:shadow-lg hover:border-primary/20 transition-all"
                        >
                          <div className="flex items-start justify-between mb-4">
                            <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                              <Icon className="w-6 h-6 text-primary" />
                            </div>
                            <ArrowIcon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
                          </div>
                          <h3 className="text-lg font-bold text-foreground mb-2">
                            {t(subject.title_ar, subject.title_en || subject.title_ar)}
                          </h3>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" />
                              {t(`${subject.lessons_count || 0} درساً`, `${subject.lessons_count || 0} Lessons`)}
                            </span>
                          </div>
                        </Link>
                      );
                    })}
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
