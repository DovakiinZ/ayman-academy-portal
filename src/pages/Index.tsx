import Layout from '@/components/layout/Layout';
import HeroSection from '@/components/home/HeroSection';
import StagesSection from '@/components/home/StagesSection';
import HowItWorksSection from '@/components/home/HowItWorksSection';
import SampleLessonsSection from '@/components/home/SampleLessonsSection';
import InstructorsSection from '@/components/home/InstructorsSection';
import TrustSection from '@/components/home/TrustSection';

const Index = () => {
  return (
    <Layout>
      <HeroSection />
      <StagesSection />
      <HowItWorksSection />
      <SampleLessonsSection />
      <InstructorsSection />
      <TrustSection />
    </Layout>
  );
};

export default Index;
