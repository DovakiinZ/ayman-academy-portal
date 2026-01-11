import { useLanguage } from '@/contexts/LanguageContext';
import { Play, Lock, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const sampleLessons = [
  {
    id: 1,
    title: { ar: 'مقدمة في الجمع والطرح', en: 'Introduction to Addition and Subtraction' },
    subject: { ar: 'الرياضيات', en: 'Mathematics' },
    stage: { ar: 'المرحلة الابتدائية', en: 'Primary' },
    duration: '12:30',
    isPreview: true,
    thumbnail: 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400&h=225&fit=crop',
  },
  {
    id: 2,
    title: { ar: 'الحروف الأبجدية العربية', en: 'Arabic Alphabet' },
    subject: { ar: 'اللغة العربية', en: 'Arabic Language' },
    stage: { ar: 'رياض الأطفال', en: 'Kindergarten' },
    duration: '08:45',
    isPreview: true,
    thumbnail: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=225&fit=crop',
  },
  {
    id: 3,
    title: { ar: 'دورة الماء في الطبيعة', en: 'The Water Cycle' },
    subject: { ar: 'العلوم', en: 'Science' },
    stage: { ar: 'المرحلة المتوسطة', en: 'Middle School' },
    duration: '15:20',
    isPreview: false,
    thumbnail: 'https://images.unsplash.com/photo-1559825481-12a05cc00344?w=400&h=225&fit=crop',
  },
  {
    id: 4,
    title: { ar: 'أساسيات اللغة الإنجليزية', en: 'English Basics' },
    subject: { ar: 'اللغة الإنجليزية', en: 'English Language' },
    stage: { ar: 'المرحلة الابتدائية', en: 'Primary' },
    duration: '10:15',
    isPreview: false,
    thumbnail: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=225&fit=crop',
  },
];

const SampleLessonsSection = () => {
  const { t } = useLanguage();

  return (
    <section className="section-academic bg-secondary/30">
      <div className="container-academic">
        <div className="text-center mb-12">
          <h2 className="text-foreground mb-4">
            {t('نماذج من الدروس', 'Sample Lessons')}
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t(
              'استعرض بعض الدروس المتاحة في منصتنا التعليمية',
              'Preview some of the lessons available on our educational platform'
            )}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {sampleLessons.map((lesson) => (
            <Link
              key={lesson.id}
              to={lesson.isPreview ? `/lesson/${lesson.id}` : '#'}
              className={`academic-card p-0 overflow-hidden group ${
                !lesson.isPreview ? 'lesson-locked cursor-default' : ''
              }`}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden">
                <img
                  src={lesson.thumbnail}
                  alt={t(lesson.title.ar, lesson.title.en)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-foreground/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {lesson.isPreview ? (
                    <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
                      <Play className="w-5 h-5 text-primary ms-0.5" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-background/90 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                {!lesson.isPreview && (
                  <div className="absolute top-2 end-2">
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-background/90 rounded text-xs text-muted-foreground">
                      <Lock className="w-3 h-3" />
                      {t('مقفل', 'Locked')}
                    </span>
                  </div>
                )}
                {lesson.isPreview && (
                  <div className="absolute top-2 end-2">
                    <span className="badge-gold text-xs">
                      {t('معاينة مجانية', 'Free Preview')}
                    </span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs text-muted-foreground">
                    {t(lesson.stage.ar, lesson.stage.en)}
                  </span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-xs text-primary font-medium">
                    {t(lesson.subject.ar, lesson.subject.en)}
                  </span>
                </div>
                <h4 className="font-medium text-foreground text-sm mb-2 line-clamp-2">
                  {t(lesson.title.ar, lesson.title.en)}
                </h4>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{lesson.duration}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <div className="text-center mt-8">
          <Link
            to="/stages"
            className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
          >
            {t('استعرض جميع الدروس ←', 'Browse All Lessons →')}
          </Link>
        </div>
      </div>
    </section>
  );
};

export default SampleLessonsSection;
