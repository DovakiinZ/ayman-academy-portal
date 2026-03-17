import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
    const { t } = useLanguage();

    return (
        <Layout>
            <div className="container-academic py-12 md:py-20 max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        {t('سياسة الخصوصية', 'Privacy Policy')}
                    </h1>
                    <p className="text-muted-foreground">
                        {t('آخر تحديث: مارس 2026', 'Last Updated: March 2026')}
                    </p>
                </div>

                <div className="prose dark:prose-invert max-w-none space-y-8 text-foreground prose-headings:text-foreground prose-a:text-primary">
                    <section>
                        <h2 className="text-xl font-bold border-b border-border pb-2 mb-4">
                            {t('القسم العربي', 'Arabic Section')}
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">ما هي البيانات التي نجمعها:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    عند التسجيل في منصتنا، نقوم بجمع البيانات الأساسية مثل الاسم، البريد الإلكتروني، رقم الهاتف، والمرحلة الدراسية. كما يجمع النظام بشكل آلي بيانات الاستخدام، مدة المشاهدة، والتقدم في الدروس.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">كيف نستخدم البيانات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    تُستخدم هذه البيانات الأساسية لتحسين وصقل تجربتك التعليمية، تتبع تقدمك بدقة، تقديم الدعم الفني المخصص، والتواصل معك بخصوص المستجدات والتحديثات الأكاديمية.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">تخزين البيانات وحمايتها:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    نحن نستخدم بروتوكولات وتشفيرات أمان متقدمة لحماية بياناتك من الوصول غير المصرح به أو التعديل. تُخزن وتُعالج البيانات في خوادم سحابية عالية الأمان.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">خصوصية معلومات الطلاب:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    معلومات الطلاب وبيانات الاتصال الخاصة بهم محمية بالكامل ولا يتم مشاركتها علانية للزوار. يمكن فقط للمعلمين المسجلين في دورات الطالب وأولياء الأمور (في حال ربط الحسابات) الاطلاع على الإنجاز الأكاديمي والتقدم.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">معلومات المعلمين:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يتم عرض المعلومات العامة والمهنية للمعلم (مثل النبذة الشخصية، المواد التي يدرسها، والتقييمات) في الصفحة العامة المخصصة له، بينما تظل البيانات المالية وبيانات الدخول الخاصة به آمنة وسرية.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">التواصل عبر البريد الإلكتروني:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    قد نرسل إليك إشعارات وتنبيهات عبر البريد الإلكتروني حول الإعلانات المهمة، اشتراكاتك الحالية، أو التحديثات الخاصة بالمنصة. يمكنك في أي وقت إلغاء الاشتراك من الرسائل الترويجية.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">استخدام ملفات تعريف الارتباط (Cookies):</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    المنصة تستخدم ملفات تعريف الارتباط لتحسين أداء وتجربة الموقع، تسجيل الدخول التلقائي الآمن، وحفظ تفضيلات التصفح الخاصة بك.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">خدمات الطرف الثالث:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    قد نستعين بخدمات جهات خارجية موثوقة (مثل بوابات الدفع الإلكتروني). هذه الجهات لها سياسات الخصوصية المستقلة والخاصة بها لمعالجة البيانات بأمان.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الاحتفاظ بالبيانات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    نحتفظ ببياناتك ومعلومات إنجازك طالما كان حسابك نشطاً لضمان استمرارية الخدمات، وللامتثال للالتزامات والأحكام القانونية.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">حقوق المستخدم تجاه بياناته:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يحق للمستخدم المسجل في الأكاديمية طلب الوصول المباشر إلى بياناته، أو تعديلها من خلال الملف الشخصي، أو طلب حذف حسابه نهائياً بالتواصل الرسمي مع فريق الدعم الفني.
                                </p>
                            </div>
                        </div>
                    </section>

                    <div className="my-10 border-t border-border" />

                    <section dir="ltr" className="text-left font-sans">
                        <h2 className="text-xl font-bold border-b border-border pb-2 mb-4 font-sans text-left">
                            English Section
                        </h2>
                        
                        <div className="space-y-6">
                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">What User Data is Collected:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Upon registration, we explicitly collect basic data such as your name, email, phone number, and educational stage. The platform also automatically tracks usage metrics, watch time, and lesson progression.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">How Data is Used:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We utilize this core data to personalize and improve your learning experience, accurately track your progress, deliver dedicated technical support, and seamlessly communicate academic updates.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Data Storage and Protection:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We employ state-of-the-art security protocols and encryptions to actively protect your data against unauthorized access or modification. Data is securely stored and processed on highly reliable cloud servers.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Student Information Privacy:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Student profile and contact information is strictly protected and never transparently shared with the public. Only enrolled teachers and verified linked parents are permitted to view a student's academic progress.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Teacher Information:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A teacher’s professional information (e.g., bio, subjects taught, and student ratings) is prominently displayed on their public showcase page, while sensitive financial and private login data remains strictly confidential.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Email Communications:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We may dispatch critical notifications and alerts via email regarding important platform announcements, current subscriptions, or systemic updates. You may opt out of non-essential promotional emails at any time.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Cookies Usage:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Our platform utilizes cookies entirely to enhance website performance, securely maintain automatic login sessions, and save your specific browsing preferences.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Third-Party Services:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We may confidently integrate secure third-party services (such as certified payment gateways). These specific organizations operate and process data under their own independent privacy policies.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Data Retention:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    We securely retain your data and academic achievements as long as your account remains active to guarantee service continuity, and to comply with legal record-keeping obligations.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">User Rights Regarding Their Data:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Registered users hold the distinct right to request direct access to their data, accurately modify it via their profile, or request a permanent account deletion by officially contacting our Technical Support team.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
