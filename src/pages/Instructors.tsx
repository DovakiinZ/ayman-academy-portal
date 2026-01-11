import { useLanguage } from '@/contexts/LanguageContext';
import Layout from '@/components/layout/Layout';

const instructors = [
  {
    id: 1,
    name: { ar: 'د. أحمد الفاروق', en: 'Dr. Ahmed Al-Farouq' },
    specialty: { ar: 'الرياضيات والعلوم', en: 'Mathematics & Science' },
    qualifications: { ar: 'دكتوراه في التربية الرياضية', en: 'PhD in Mathematics Education' },
    experience: { ar: '15 عاماً في التعليم الأكاديمي', en: '15 years in academic education' },
    bio: {
      ar: 'خبرة واسعة في تدريس الرياضيات للمراحل الابتدائية والمتوسطة. متخصص في تبسيط المفاهيم الرياضية المعقدة وجعلها في متناول جميع الطلاب.',
      en: 'Extensive experience teaching mathematics for primary and middle school levels. Specialized in simplifying complex mathematical concepts and making them accessible to all students.',
    },
    lessons: 48,
    image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 2,
    name: { ar: 'أ. فاطمة السعيد', en: 'Ms. Fatima Al-Saeed' },
    specialty: { ar: 'اللغة العربية والتربية الإسلامية', en: 'Arabic Language & Islamic Studies' },
    qualifications: { ar: 'ماجستير في اللغة العربية وآدابها', en: 'Master\'s in Arabic Language & Literature' },
    experience: { ar: '12 عاماً في التعليم الأكاديمي', en: '12 years in academic education' },
    bio: {
      ar: 'متخصصة في تدريس اللغة العربية بأساليب حديثة تجمع بين الأصالة والمعاصرة. تهتم بتنمية مهارات القراءة والكتابة والتعبير.',
      en: 'Specialized in teaching Arabic using modern methods that combine tradition and contemporary approaches. Focused on developing reading, writing, and expression skills.',
    },
    lessons: 36,
    image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 3,
    name: { ar: 'أ. محمد العلي', en: 'Mr. Mohammed Al-Ali' },
    specialty: { ar: 'اللغة الإنجليزية', en: 'English Language' },
    qualifications: { ar: 'بكالوريوس في اللغة الإنجليزية من جامعة أكسفورد', en: 'Bachelor\'s in English from Oxford University' },
    experience: { ar: '10 أعوام في التعليم الأكاديمي', en: '10 years in academic education' },
    bio: {
      ar: 'متخصص في تعليم اللغة الإنجليزية للناطقين بالعربية. يركز على بناء أساس قوي في القواعد والمحادثة والاستماع.',
      en: 'Specialized in teaching English to Arabic speakers. Focuses on building a strong foundation in grammar, conversation, and listening skills.',
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
    bio: {
      ar: 'شغوفة بتقديم العلوم بطريقة مشوقة وعملية. تستخدم التجارب والأمثلة الواقعية لجعل المفاهيم العلمية أكثر وضوحاً.',
      en: 'Passionate about presenting science in an engaging and practical way. Uses experiments and real-world examples to make scientific concepts clearer.',
    },
    lessons: 35,
    image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 5,
    name: { ar: 'أ. خالد المنصور', en: 'Mr. Khalid Al-Mansour' },
    specialty: { ar: 'الدراسات الاجتماعية والتاريخ', en: 'Social Studies & History' },
    qualifications: { ar: 'ماجستير في التاريخ الإسلامي', en: 'Master\'s in Islamic History' },
    experience: { ar: '14 عاماً في التعليم الأكاديمي', en: '14 years in academic education' },
    bio: {
      ar: 'يهتم بربط التاريخ بالحاضر وجعل الدراسات الاجتماعية مادة حية ومثيرة للاهتمام. يستخدم القصص والأمثلة التفاعلية في التدريس.',
      en: 'Interested in connecting history with the present and making social studies a vibrant and engaging subject. Uses stories and interactive examples in teaching.',
    },
    lessons: 28,
    image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&h=300&fit=crop&crop=face',
  },
  {
    id: 6,
    name: { ar: 'أ. نورة القاسم', en: 'Ms. Noura Al-Qasim' },
    specialty: { ar: 'رياض الأطفال والتعليم المبكر', en: 'Kindergarten & Early Education' },
    qualifications: { ar: 'ماجستير في تربية الطفولة المبكرة', en: 'Master\'s in Early Childhood Education' },
    experience: { ar: '11 عاماً في التعليم الأكاديمي', en: '11 years in academic education' },
    bio: {
      ar: 'متخصصة في تعليم الأطفال الصغار باستخدام أساليب اللعب والتفاعل. تركز على بناء الثقة وحب التعلم منذ الصغر.',
      en: 'Specialized in teaching young children using play and interactive methods. Focuses on building confidence and love for learning from an early age.',
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
      <section className="bg-secondary/30 py-12 md:py-16 border-b border-border">
        <div className="container-academic">
          <h1 className="text-foreground mb-4">
            {t('الهيئة التعليمية', 'Faculty')}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {instructors.map((instructor) => (
              <div key={instructor.id} className="academic-card">
                <div className="flex items-start gap-4 mb-4">
                  <img
                    src={instructor.image}
                    alt={t(instructor.name.ar, instructor.name.en)}
                    className="w-20 h-20 rounded-full object-cover border-2 border-border shrink-0"
                  />
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">
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
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {t(instructor.bio.ar, instructor.bio.en)}
                </p>
                <div className="flex items-center gap-4 pt-4 border-t border-border text-xs text-muted-foreground">
                  <span>{t(instructor.experience.ar, instructor.experience.en)}</span>
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
