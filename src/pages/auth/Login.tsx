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

export default function Login() {
    const { signIn, resetPassword, role, isAuthenticated, redirectByRole, isLoading: authLoading } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Forgot password state
    const [showForgotPassword, setShowForgotPassword] = useState(false);
    const [forgotEmail, setForgotEmail] = useState('');
    const [forgotSubmitting, setForgotSubmitting] = useState(false);
    const [forgotSuccess, setForgotSuccess] = useState(false);

    // If already authenticated, redirect based on role
    useEffect(() => {
        if (!authLoading && isAuthenticated && role) {
            redirectByRole(role);
        }
    }, [authLoading, isAuthenticated, role, redirectByRole]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError('');
        setIsSubmitting(true);

        try {
            const { error: signInError } = await signIn(email, password);

            if (signInError) {
                // Map common error codes to user-friendly messages
                if (signInError.message.includes('Invalid login credentials')) {
                    setError(t('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'Invalid email or password'));
                } else if (signInError.message.includes('Email not confirmed')) {
                    setError(t('يرجى تأكيد بريدك الإلكتروني أولاً', 'Please confirm your email first'));
                } else if (signInError.message.includes('Network')) {
                    setError(t('خطأ في الاتصال، حاول مرة أخرى', 'Network error, please try again'));
                } else {
                    setError(signInError.message);
                }
                return;
            }

            // Success - the auth state change will trigger redirect
            toast.success(t('تم تسجيل الدخول بنجاح', 'Signed in successfully'));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (forgotSubmitting) return;

        setForgotSubmitting(true);

        try {
            const { error } = await resetPassword(forgotEmail);

            if (error) {
                toast.error(t('فشل إرسال رابط إعادة التعيين', 'Failed to send reset link'), {
                    description: error.message,
                });
                return;
            }

            setForgotSuccess(true);
            toast.success(t('تم إرسال رابط إعادة التعيين', 'Reset link sent'), {
                description: t('تحقق من بريدك الإلكتروني', 'Check your email'),
            });
        } finally {
            setForgotSubmitting(false);
        }
    };

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

    // Show forgot password form
    if (showForgotPassword) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-sm">
                    <div className="text-center mb-8">
                        <Link to="/">
                            <img src={logo} alt="Ayman Academy" className="h-24 mx-auto mb-4" />
                        </Link>
                        <h1 className="text-xl font-semibold text-foreground">
                            {t('نسيت كلمة المرور', 'Forgot Password')}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {t('أدخل بريدك الإلكتروني لإعادة تعيين كلمة المرور', 'Enter your email to reset your password')}
                        </p>
                    </div>

                    {forgotSuccess ? (
                        <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4 text-center">
                            <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-3" />
                            <p className="text-sm text-green-800 dark:text-green-200">
                                {t('تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني', 'Reset link sent to your email')}
                            </p>
                            <Button
                                variant="link"
                                className="mt-2"
                                onClick={() => {
                                    setShowForgotPassword(false);
                                    setForgotSuccess(false);
                                    setForgotEmail('');
                                }}
                            >
                                {t('العودة لتسجيل الدخول', 'Back to login')}
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={handleForgotPassword} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="forgot-email">{t('البريد الإلكتروني', 'Email')}</Label>
                                <Input
                                    id="forgot-email"
                                    type="email"
                                    value={forgotEmail}
                                    onChange={(e) => setForgotEmail(e.target.value)}
                                    placeholder={t('أدخل بريدك الإلكتروني', 'Enter your email')}
                                    required
                                    disabled={forgotSubmitting}
                                />
                            </div>

                            <Button type="submit" className="w-full" disabled={forgotSubmitting}>
                                {forgotSubmitting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    t('إرسال رابط إعادة التعيين', 'Send Reset Link')
                                )}
                            </Button>

                            <Button
                                type="button"
                                variant="ghost"
                                className="w-full"
                                onClick={() => setShowForgotPassword(false)}
                            >
                                {t('العودة لتسجيل الدخول', 'Back to login')}
                            </Button>
                        </form>
                    )}
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
                        {t('تسجيل الدخول', 'Sign In')}
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        {t('لوحة تحكم الأكاديمية', 'Academy Dashboard')}
                    </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
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
                                placeholder={t('أدخل كلمة المرور', 'Enter your password')}
                                required
                                disabled={isSubmitting}
                                autoComplete="current-password"
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
                    </div>

                    {/* Forgot Password Link */}
                    <div className="text-end">
                        <button
                            type="button"
                            onClick={() => setShowForgotPassword(true)}
                            className="text-sm text-primary hover:underline"
                        >
                            {t('نسيت كلمة المرور؟', 'Forgot password?')}
                        </button>
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
                                {t('دخول', 'Sign In')}
                                <ArrowIcon className="w-4 h-4 ms-2" />
                            </>
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm text-muted-foreground">
                    <p>
                        {t('ليس لديك حساب؟', "Don't have an account?")}{' '}
                        <Link to="/register" className="text-primary hover:underline font-medium">
                            {t('إنشاء حساب طالب', 'Create student account')}
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