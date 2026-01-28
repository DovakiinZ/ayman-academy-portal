import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Register() {
    const { signUp, isLoading: authLoading } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [acceptTerms, setAcceptTerms] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validation
        if (!fullName.trim()) {
            setError(t('الرجاء إدخال الاسم الكامل', 'Please enter your full name'));
            return;
        }

        if (password.length < 6) {
            setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
            return;
        }

        if (password !== confirmPassword) {
            setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
            return;
        }

        if (!acceptTerms) {
            setError(t('يجب الموافقة على الشروط والأحكام', 'You must accept the terms and conditions'));
            return;
        }

        setIsSubmitting(true);

        const { error } = await signUp(email, password, {
            full_name: fullName,
            role: 'student' // Force student role for public registration
        });

        if (error) {
            if (error.message.includes('already registered')) {
                setError(t('هذا البريد الإلكتروني مسجل مسبقاً', 'This email is already registered'));
            } else {
                setError(t('حدث خطأ أثناء التسجيل', 'An error occurred during registration'));
            }
            setIsSubmitting(false);
            return;
        }

        // Redirect to available courses (stages) so they can browse content immediately
        navigate('/stages', { replace: true });
    };

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/">
                        <img src={logo} alt="Ayman Academy" className="h-24 mx-auto mb-4" />
                    </Link>
                    <h1 className="text-2xl font-semibold text-foreground">
                        {t('إنشاء حساب جديد', 'Create New Account')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-2">
                        {t('انضم إلى أكاديمية أيمن وابدأ رحلتك التعليمية', 'Join Ayman Academy and start your learning journey')}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">{t('الاسم الكامل', 'Full Name')}</Label>
                        <Input
                            id="fullName"
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder={t('أدخل اسمك الكامل', 'Enter your full name')}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">{t('البريد الإلكتروني', 'Email')}</Label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={t('أدخل بريدك الإلكتروني', 'Enter your email')}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">{t('كلمة المرور', 'Password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('أدخل كلمة المرور', 'Enter password')}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                            required
                            disabled={isSubmitting}
                        />
                    </div>

                    <div className="flex items-start gap-2">
                        <Checkbox
                            id="terms"
                            checked={acceptTerms}
                            onCheckedChange={(checked) => setAcceptTerms(checked as boolean)}
                            disabled={isSubmitting}
                        />
                        <Label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                            {t(
                                'أوافق على الشروط والأحكام وسياسة الخصوصية',
                                'I agree to the Terms and Conditions and Privacy Policy'
                            )}
                        </Label>
                    </div>

                    {error && (
                        <p className="text-sm text-destructive">{error}</p>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting || authLoading}
                    >
                        {isSubmitting ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <>
                                {t('إنشاء الحساب', 'Create Account')}
                                <ArrowIcon className="w-4 h-4 ms-2" />
                            </>
                        )}
                    </Button>
                </form>

                {/* Login link */}
                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        {t('لديك حساب؟', 'Already have an account?')}{' '}
                        <Link
                            to="/login"
                            className="text-primary hover:underline font-medium"
                        >
                            {t('تسجيل الدخول', 'Sign In')}
                        </Link>
                    </p>
                </div>

                {/* Back to home */}
                <div className="mt-4 text-center">
                    <Link
                        to="/"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        {t('العودة للرئيسية', 'Back to Home')}
                    </Link>
                </div>
            </div>
        </div>
    );
}
