import Layout from '@/components/layout/Layout';
import HeroSection from '@/components/home/HeroSection';
import StagesSection from '@/components/home/StagesSection';
import FeaturedTeachersSection from '@/components/home/FeaturedTeachersSection';
import FeaturedSubjectsSection from '@/components/home/FeaturedSubjectsSection';
import FeaturedLessonsSection from '@/components/home/FeaturedLessonsSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import TrustSection from '@/components/home/TrustSection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <StagesSection />
      <FeaturedSubjectsSection />
      <FeaturedTeachersSection />
      <FeaturedLessonsSection />
      <HowItWorksSection />
      <TrustSection />
    </Layout>
  );
};

export default Index;

