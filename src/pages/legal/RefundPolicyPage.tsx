import Layout from '@/components/layout/Layout';
import { useLanguage } from '@/contexts/LanguageContext';

export default function RefundPolicyPage() {
    const { t } = useLanguage();

    return (
        <Layout>
            <div className="container-academic py-12 md:py-20 max-w-4xl mx-auto">
                <div className="text-center mb-12">
                    <h1 className="text-3xl font-bold text-foreground mb-4">
                        {t('سياسة الاسترداد', 'Refund Policy')}
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
                                <h3 className="text-base font-bold text-primary mb-2">متى يحق للطالب طلب استرداد الأموال:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    بإمكان الطالب أو ولي الأمر طلب استرداد الأموال إذا كان أحدهما غير راضٍ أبداً عن جودة المحتوى التعليمي للدورة، وذلك بشرط ألا يكون الطالب قد تجاوز نسبة محددة من مشاهدة الدروس أو قام باستخراج أي شهادة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الحدود الزمنية لطلبات الاسترداد:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    يُسمح بتقديم طلب الاسترداد المالي خلال فترة أقصاها 14 يوماً من تاريخ الإيصال أو تفعيل الاشتراك الأولي المنصوص عليه.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الحالات التي لا يُسمح فيها بالاسترداد:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">لن يتم قبول أي طلب استرداد مالي في الحالات التالية:</p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed space-y-1">
                                    <li>إذا أتم أو شاهد الطالب أكثر من 30% من الحجم الإجمالي لمحتوى الدورة المعنية.</li>
                                    <li>إذا قام الطالب فعلياً بتحميل المواد التعليمية المرفقة أو بادر باستخراج شهادة إتمام الدورة الرقمية.</li>
                                    <li>الفترات الخاصة بالتجديد التلقائي للاشتراكات في حال لم يتم إلغاؤها بشكل يدوي قبل موعد التجديد بوقت كافٍ.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">قواعد إلغاء الاشتراك:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    لكامل الحرية في إلغاء الاشتراك (الشهري أو السنوي) في أي وقت ترغب به عبر الإعدادات الخاصة بك، وسيستمر وصولك الفعال للمحتوى حتى نهاية الفترة المدفوعة بالكامل. لا نقوم بإجراء استرداد مالي نسبي للفترات المتبقية أو غير المستخدمة.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">الجداول الزمنية لمعالجة المدفوعات:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    بمجرد الموافقة الرسمية على طلب الاسترداد من قِبل الإدارة، قد تستغرق العملية المصرفية من 5 إلى 14 يوم عمل ليظهر المبلغ بنجاح في حسابك البنكي أو بطاقتك الائتمانية.
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
                                <h3 className="text-base font-bold text-primary mb-2">When a Student Can Request a Refund:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    A student, or their guardian, may officially request a refund if they are entirely unsatisfied with the educational quality of the course content, provided they have not exceeded a specific viewing threshold or generated any completion documents.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Time Limits for Refund Requests:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Refund requests must be formally submitted within a strict maximum of 14 days from the original purchase receipt or initial subscription activation date.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Cases Where Refunds Are Not Allowed:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed mb-2">Financial refund requests will definitively be declined under the following conditions:</p>
                                <ul className="list-disc list-outside ml-4 text-sm text-muted-foreground leading-relaxed space-y-1">
                                    <li>If the individual student has consumed or completed more than 30% of the specific course's total volume of content.</li>
                                    <li>If the student has actively downloaded supplementary educational materials or successfully generated a digital certificate of completion.</li>
                                    <li>Auto-renewal subscription charges, if the overarching subscription was not manually canceled well before the upcoming renewal date.</li>
                                </ul>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Subscription Cancellation Rules:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    You possess the complete freedom to confidently cancel a monthly or yearly subscription at any time via your settings. Your active access to the content will persist unabated until the conclusion of your current, fully paid billing cycle. We completely decline to offer prorated financial refunds for any unused time or remaining periods.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-primary mb-2">Payment Processing Timelines:</h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    Once a refund request is officially approved by administration, the banking process may take anywhere from 5 to 14 business days for the financial funds to visibly reflect in your original bank account or credit card statement.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </Layout>
    );
}
