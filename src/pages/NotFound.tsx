import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const { t } = useLanguage();

  return (
    <Layout>
      <section className="section-academic">
        <div className="container-academic text-center">
          <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-4">
            {t("الصفحة غير موجودة", "Page Not Found")}
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {t(
              "عذراً، الصفحة التي تبحث عنها غير موجودة أو تم نقلها",
              "Sorry, the page you are looking for does not exist or has been moved"
            )}
          </p>
          <Link to="/">
            <Button>
              {t("العودة للرئيسية", "Return to Home")}
            </Button>
          </Link>
        </div>
      </section>
    </Layout>
  );
};

export default NotFound;
