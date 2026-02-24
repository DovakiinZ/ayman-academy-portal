import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';

const instructors = [
  {
    id: 1,
    name: { ar: 'د. أحمد الفاروق', en: 'Dr. Ahmed Al-Farouq' },
    specialty: { ar: 'الرياضيات والعلوم', en: 'Mathematics & Science' },
    qualifications: { ar: 'دكتوراه في التربية الرياضية', en: 'PhD in Mathematics Education' },
    experience: { ar: '15 عاماً في التعليم الأكاديمي', en: '15 years in academic education' },
    stages: { ar: 'الابتدائي والمتوسط', en: 'Primary & Middle School' },
    bio: {
      ar: 'خبرة واسعة في تدريس الرياضيات للمراحل الابتدائية والمتوسطة. متخصص في تبسيط المفاهيم الرياضية المعقدة.',
      en: 'Extensive experience teaching mathematics for primary and middle school levels. Specialized in simplifying complex mathematical concepts.',
    },
    lessons: 48,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 2,
    name: { ar: 'أ. فاطمة السعيد', en: 'Ms. Fatima Al-Saeed' },
    specialty: { ar: 'اللغة العربية والتربية الإسلامية', en: 'Arabic Language & Islamic Studies' },
    qualifications: { ar: 'ماجستير في اللغة العربية وآدابها', en: "Master's in Arabic Language & Literature" },
    experience: { ar: '12 عاماً في التعليم الأكاديمي', en: '12 years in academic education' },
    stages: { ar: 'جميع المراحل', en: 'All Stages' },
    bio: {
      ar: 'متخصصة في تدريس اللغة العربية بأساليب حديثة تجمع بين الأصالة والمعاصرة.',
      en: 'Specialized in teaching Arabic using modern methods that combine tradition and contemporary approaches.',
    },
    lessons: 36,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 3,
    name: { ar: 'أ. محمد العلي', en: 'Mr. Mohammed Al-Ali' },
    specialty: { ar: 'اللغة الإنجليزية', en: 'English Language' },
    qualifications: { ar: 'بكالوريوس في اللغة الإنجليزية', en: "Bachelor's in English" },
    experience: { ar: '10 أعوام في التعليم الأكاديمي', en: '10 years in academic education' },
    stages: { ar: 'الابتدائي والمتوسط', en: 'Primary & Middle School' },
    bio: {
      ar: 'متخصص في تعليم اللغة الإنجليزية للناطقين بالعربية. يركز على بناء أساس قوي في القواعد والمحادثة.',
      en: 'Specialized in teaching English to Arabic speakers. Focuses on building a strong foundation in grammar and conversation.',
    },
    lessons: 42,
    image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 4,
    name: { ar: 'د. سارة الأحمد', en: 'Dr. Sara Al-Ahmad' },
    specialty: { ar: 'العلوم الطبيعية', en: 'Natural Sciences' },
    qualifications: { ar: 'دكتوراه في الكيمياء الحيوية', en: 'PhD in Biochemistry' },
    experience: { ar: '8 أعوام في التعليم الأكاديمي', en: '8 years in academic education' },
    stages: { ar: 'الابتدائي والمتوسط', en: 'Primary & Middle School' },
    bio: {
      ar: 'شغوفة بتقديم العلوم بطريقة مشوقة وعملية. تستخدم التجارب والأمثلة الواقعية.',
      en: 'Passionate about presenting science in an engaging and practical way. Uses experiments and real-world examples.',
    },
    lessons: 35,
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 5,
    name: { ar: 'أ. خالد المنصور', en: 'Mr. Khalid Al-Mansour' },
    specialty: { ar: 'الدراسات الاجتماعية والتاريخ', en: 'Social Studies & History' },
    qualifications: { ar: 'ماجستير في التاريخ الإسلامي', en: "Master's in Islamic History" },
    experience: { ar: '14 عاماً في التعليم الأكاديمي', en: '14 years in academic education' },
    stages: { ar: 'المتوسط', en: 'Middle School' },
    bio: {
      ar: 'يهتم بربط التاريخ بالحاضر وجعل الدراسات الاجتماعية مادة حية ومثيرة للاهتمام.',
      en: 'Interested in connecting history with the present and making social studies a vibrant subject.',
    },
    lessons: 28,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 6,
    name: { ar: 'أ. نورة القاسم', en: 'Ms. Noura Al-Qasim' },
    specialty: { ar: 'رياض الأطفال والتعليم المبكر', en: 'Kindergarten & Early Education' },
    qualifications: { ar: 'ماجستير في تربية الطفولة المبكرة', en: "Master's in Early Childhood Education" },
    experience: { ar: '11 عاماً في التعليم الأكاديمي', en: '11 years in academic education' },
    stages: { ar: 'التمهيدي', en: 'Kindergarten' },
    bio: {
      ar: 'متخصصة في تعليم الأطفال الصغار باستخدام أساليب اللعب والتفاعل.',
      en: 'Specialized in teaching young children using play and interactive methods.',
    },
    lessons: 52,
    image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&h=300&fit=crop&crop=face',
  },
];

const Instructors = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      {/* Header */}
      <section className="bg-secondary/30 py-10 md:py-12 border-b border-border">
        <div className="container-academic">
          <h1 className="text-foreground mb-3">
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
      <section className="section-academic">
        <div className="container-academic">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="academic-card">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={instructor.image}
                    alt={t(instructor.name.ar, instructor.name.en)}
                    className="w-16 h-16 rounded-full object-cover border border-border shrink-0"
                  />
                  <div className="min-w-0">
                    <h3 className="text-base font-medium text-foreground mb-0.5">
                      {t(instructor.name.ar, instructor.name.en)}
                    </h3>
                    <p className="text-sm text-primary mb-1">
                      {t(instructor.specialty.ar, instructor.specialty.en)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t(instructor.qualifications.ar, instructor.qualifications.en)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  {t(instructor.bio.ar, instructor.bio.en)}
                </p>
                <div className="flex items-center gap-3 pt-3 border-t border-border text-xs text-muted-foreground">
                  <span>{t(instructor.experience.ar, instructor.experience.en)}</span>
                  <span className="text-border">|</span>
                  <span>{t(instructor.stages.ar, instructor.stages.en)}</span>
                  <span className="text-border">|</span>
                  <span>{t(`${instructor.lessons} درساً`, `${instructor.lessons} Lessons`)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Layout>
  );
};

export default Instructors;
