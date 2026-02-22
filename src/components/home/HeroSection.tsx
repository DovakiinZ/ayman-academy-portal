import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTemplate } from '@/hooks/useTemplate';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import heroImage from '@/assets/hero-library.jpg';

const HeroSection = () => {
  const { direction } = useLanguage();
  const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

  // Dynamic Content
  const browText = useTemplate('home.hero.brow', 'أكاديمية تعليمية', 'Educational Academy');
  const titleText = useTemplate('home.hero.title', 'تعليم أكاديمي متميز', 'Premium Academic Education');
  const descText = useTemplate(
    'home.hero.desc',
    'منهج تعليمي متكامل يجمع بين الأساليب الأكاديمية الحديثة والقيم التربوية الراسخة.',
    'A comprehensive curriculum combining modern academic methods with established educational values.'
  );
  const ctaText = useTemplate('home.hero.cta', 'استعرض المراحل', 'Explore Stages');
  const subCtaText = useTemplate('home.hero.subcta', 'معلومات الاشتراك', 'Subscription Info');

  return (
    <section className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden">
      {/* Background Image with Premium Overlay */}
      <div className="absolute inset-0">
        <img
          src={heroImage}
          alt={browText}
          className="w-full h-full object-cover grayscale-[0.2] brightness-[0.8] dark:brightness-[0.55]"
        />
        {/* Light mode gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
        {/* Dark mode directional gradient overlay */}
        <div className="absolute inset-0 hidden dark:block bg-gradient-to-l from-background/95 via-background/75 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative max-w-7xl mx-auto px-6 py-24 md:py-32 w-full">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-bold tracking-widest uppercase text-primary/80">
              {browText}
            </p>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-foreground mb-6 leading-[1.15]">
            {titleText}
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-lg leading-relaxed font-medium">
            {descText}
          </p>

          <div className="flex flex-wrap items-center gap-5">
            <Link to="/stages">
              <Button size="lg" className="h-14 px-8 rounded-2xl text-base font-bold gap-3 transition-all hover:scale-105 active:scale-95 bg-primary hover:bg-primary/90 btn-glow">
                {ctaText}
                <ArrowIcon className="w-5 h-5" />
              </Button>
            </Link>
            <Link
              to="/plans"
              className="text-sm font-bold text-muted-foreground hover:text-primary transition-colors py-2 px-4 rounded-xl hover:bg-card/50 backdrop-blur-sm shadow-sm border border-border"
            >
              {subCtaText}
            </Link>
          </div>

          {/* Section accent line */}
          <div className="section-accent-line mt-10 mx-0" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
