import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import logo from '@/assets/logo.png';

export default function Register() {
    const { signUp, role, isAuthenticated, redirectByRole, isLoading: authLoading } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    // If already authenticated, redirect based on role
    useEffect(() => {
        if (!authLoading && isAuthenticated && role) {
            redirectByRole(role);
        }
    }, [authLoading, isAuthenticated, role, redirectByRole]);

    const validateForm = () => {
        if (fullName.trim().length < 2) {
            setError(t('الاسم يجب أن يكون حرفين على الأقل', 'Name must be at least 2 characters'));
            return false;
        }

        if (password.length < 6) {
            setError(t('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'Password must be at least 6 characters'));
            return false;
        }

        if (password !== confirmPassword) {
            setError(t('كلمتا المرور غير متطابقتين', 'Passwords do not match'));
            return false;
        }

        return true;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');

        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            const { error: signUpError } = await signUp(email, password, fullName);

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError(t('هذا البريد الإلكتروني مسجل بالفعل', 'This email is already registered'));
                } else if (signUpError.message.includes('Password')) {
                    setError(t('كلمة المرور ضعيفة جداً', 'Password is too weak'));
                } else {
                    setError(signUpError.message);
                }
                return;
            }

            // Success
            setSuccess(true);
            toast.success(t('تم إنشاء الحساب بنجاح', 'Account created successfully'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    // Show success message
    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <Link to="/">
                            <img src={logo} alt="Ayman Academy" className="h-24 mx-auto mb-4" />
                        </Link>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                        <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-4" />
                        <h2 className="text-lg font-semibold text-foreground mb-2">
                            {t('تم إنشاء الحساب!', 'Account Created!')}
                        </h2>
                        <p className="text-sm text-muted-foreground mb-4">
                            {t(
                                'تحقق من بريدك الإلكتروني لتأكيد حسابك، ثم قم بتسجيل الدخول.',
                                'Check your email to confirm your account, then sign in.'
                            )}
                        </p>
                        <Link to="/login">
                            <Button className="w-full">
                                {t('الذهاب لتسجيل الدخول', 'Go to Sign In')}
                                <ArrowIcon className="w-4 h-4 ms-2" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link to="/">
                        <img src={logo} alt="Ayman Academy" className="h-24 mx-auto mb-4" />
                    </Link>
                    <h1 className="text-xl font-semibold text-foreground">
                        {t('إنشاء حساب طالب', 'Create Student Account')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('انضم إلى أكاديمية أيمن اليوم', 'Join Ayman Academy today')}
                    </p>
                </div>

                {/* Note about teachers */}
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-6 text-center">
                    <p className="text-xs text-muted-foreground">
                        {t('هل أنت معلم؟', 'Are you a teacher?')}{' '}
                        <a href="/apply/teacher" className="text-primary font-medium hover:underline">
                            {t('سجّل كمعلم من هنا', 'Register as a teacher here')}
                        </a>
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
                            autoComplete="name"
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
                            autoComplete="email"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">{t('كلمة المرور', 'Password')}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={t('كلمة مرور قوية', 'Strong password')}
                                required
                                disabled={isSubmitting}
                                autoComplete="new-password"
                                className="pe-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {t('6 أحرف على الأقل', 'At least 6 characters')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">{t('تأكيد كلمة المرور', 'Confirm Password')}</Label>
                        <Input
                            id="confirmPassword"
                            type={showPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder={t('أعد إدخال كلمة المرور', 'Re-enter password')}
                            required
                            disabled={isSubmitting}
                            autoComplete="new-password"
                        />
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                            <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                            <p className="text-sm text-destructive">{error}</p>
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full"
                        disabled={isSubmitting}
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

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>
                        {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            {t('تسجيل الدخول', 'Sign In')}
                        </Link>
                    </p>
                </div>

                {/* Back to home */}
                <div className="mt-6 text-center">
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
