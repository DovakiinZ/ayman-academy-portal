import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import logo from '@/assets/logo.png';

export default function Login() {
    const { signIn, isLoading: authLoading } = useAuth();
    const { t, direction } = useLanguage();
    const navigate = useNavigate();
    const location = useLocation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const from = (location.state as { from?: Location })?.from?.pathname || '/';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSubmitting(true);

        const { error } = await signIn(email, password);

        if (error) {
            setError(t('البريد الإلكتروني أو كلمة المرور غير صحيحة', 'Invalid email or password'));
            setIsSubmitting(false);
            return;
        }

        // Redirect based on role will be handled by the dashboard
        navigate(from, { replace: true });
    };

    const ArrowIcon = direction === 'rtl' ? ArrowLeft : ArrowRight;

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
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">{t('كلمة المرور', 'Password')}</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={t('أدخل كلمة المرور', 'Enter your password')}
                            required
                            disabled={isSubmitting}
                        />
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
                            {t('إنشاء حساب جديد', 'Create new account')}
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
