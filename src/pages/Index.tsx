import { useSettings } from '@/contexts/SettingsContext';
import Layout from '@/components/layout/Layout';
import HeroSection from '@/components/home/HeroSection';
import StagesSection from '@/components/home/StagesSection';
import FeaturedTeachersSection from '@/components/home/FeaturedTeachersSection';
import FeaturedSubjectsSection from '@/components/home/FeaturedSubjectsSection';
import FeaturedLessonsSection from '@/components/home/FeaturedLessonsSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import TrustSection from '@/components/home/TrustSection';

const Index = () => {
  const { get } = useSettings();

  return (
    <Layout>
      <HeroSection />
      <StagesSection />
      {get('home.show_featured_subjects') && <FeaturedSubjectsSection />}
      {get('home.show_featured_teachers') && <FeaturedTeachersSection />}
      {get('home.show_featured_lessons') && <FeaturedLessonsSection />}
      <HowItWorksSection />
      <TrustSection />
    </Layout>
  );
};

export default Index;

