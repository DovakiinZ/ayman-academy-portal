/**
 * TeacherApplication — Public teacher registration + application form
 * Creates auth account + profile (is_active: false) + application record.
 * Teacher can log in immediately but is restricted until admin approves.
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import Layout from '@/components/layout/Layout';
import { toast } from 'sonner';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { GraduationCap, CheckCircle, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const GRADE_OPTIONS = [
    { value: 'kindergarten', ar: 'تمهيدي', en: 'Kindergarten' },
    { value: 'primary', ar: 'ابتدائي', en: 'Primary (1-6)' },
    { value: 'middle', ar: 'متوسط', en: 'Middle (7-9)' },
    { value: 'high', ar: 'ثانوي', en: 'High School (10-12)' },
];

const applicationSchema = z.object({
    full_name: z.string().min(3, 'الاسم مطلوب (3 أحرف على الأقل)'),
    email: z.string().email('بريد إلكتروني غير صالح'),
    password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
    confirm_password: z.string(),
    phone: z.string().min(6, 'رقم الهاتف مطلوب'),
    bio: z.string().min(20, 'يرجى كتابة نبذة عنك (20 حرف على الأقل)'),
    profession: z.string().min(2, 'المهنة مطلوبة'),
    major: z.string().optional(),
    grades_taught: z.string().min(1, 'يرجى اختيار مرحلة واحدة على الأقل'),
}).refine((data) => data.password === data.confirm_password, {
    message: 'كلمات المرور غير متطابقة',
    path: ['confirm_password'],
});

type ApplicationFormData = z.infer<typeof applicationSchema>;

export default function TeacherApplication() {
    const { t, language, direction } = useLanguage();
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<ApplicationFormData>({
        resolver: zodResolver(applicationSchema),
        defaultValues: {
            full_name: '',
            email: '',
            password: '',
            confirm_password: '',
            phone: '',
            bio: '',
            profession: '',
            major: '',
            grades_taught: '',
        },
    });

    const handleGradeToggle = (gradeValue: string, checked: boolean) => {
        const updated = checked
            ? [...selectedGrades, gradeValue]
            : selectedGrades.filter((g) => g !== gradeValue);
        setSelectedGrades(updated);
        setValue('grades_taught', updated.join(','), { shouldValidate: true });
    };

    const onSubmit = async (data: ApplicationFormData) => {
        setSubmitting(true);
        try {
            // 1. Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: data.email,
                password: data.password,
                options: {
                    data: {
                        full_name: data.full_name,
                        role: 'teacher',
                    },
                },
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error('Failed to create account');

            // 2. Create profile (is_active: false — pending approval)
            const { error: profileError } = await (supabase.from('profiles') as any)
                .insert({
                    id: authData.user.id,
                    email: data.email,
                    full_name: data.full_name,
                    role: 'teacher',
                    is_active: false,
                    bio_ar: data.bio,
                    language_pref: 'ar',
                })
                .select()
                .single();

            if (profileError) {
                console.error('Profile creation error:', profileError);
                // Profile might be auto-created by trigger, update it instead
                await (supabase.from('profiles') as any)
                    .update({
                        full_name: data.full_name,
                        role: 'teacher',
                        is_active: false,
                        bio_ar: data.bio,
                    })
                    .eq('id', authData.user.id);
            }

            // 3. Create application record
            const { error: appError } = await supabase
                .from('teacher_applications')
                .insert({
                    full_name: data.full_name,
                    email: data.email,
                    phone: data.phone,
                    bio: data.bio,
                    profession: data.profession,
                    major: data.major || null,
                    grades_taught: data.grades_taught,
                    status: 'pending',
                });

            if (appError) {
                console.error('Application insert error:', appError);
                // Don't throw — account is created, application is secondary
            }

            // Sign out so they can log in fresh
            await supabase.auth.signOut();

            setSubmitted(true);
        } catch (err: any) {
            console.error('Registration error:', err);
            if (err.message?.includes('already registered')) {
                toast.error(t(
                    'هذا البريد الإلكتروني مسجل بالفعل. جرب تسجيل الدخول.',
                    'This email is already registered. Try signing in.'
                ));
            } else {
                toast.error(
                    t('حدث خطأ في إنشاء الحساب', 'An error occurred creating your account'),
                    { description: err.message }
                );
            }
        } finally {
            setSubmitting(false);
        }
    };

    const BackArrow = direction === 'rtl' ? ArrowRight : ArrowLeft;
    const PasswordIcon = showPassword ? EyeOff : Eye;

    if (submitted) {
        return (
            <Layout>
                <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
                    <div className="max-w-md w-full text-center space-y-6">
                        <div className="flex justify-center">
                            <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                                <CheckCircle className="w-10 h-10 text-green-600" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold">
                            {t('تم إنشاء حسابك بنجاح!', 'Account Created Successfully!')}
                        </h1>
                        <p className="text-muted-foreground leading-relaxed">
                            {t(
                                'حسابك قيد المراجعة من قبل الإدارة. يمكنك تسجيل الدخول ومتابعة حالة طلبك وتعديل ملفك الشخصي.',
                                'Your account is under review. You can log in to check your application status and edit your profile.'
                            )}
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center">
                            <Button asChild>
                                <Link to="/login">{t('تسجيل الدخول', 'Sign In')}</Link>
                            </Button>
                            <Button asChild variant="outline">
                                <Link to="/">
                                    <BackArrow className="w-4 h-4 me-2" />
                                    {t('الصفحة الرئيسية', 'Homepage')}
                                </Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="py-12 px-4" dir={direction}>
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-10 space-y-3">
                        <div className="flex justify-center">
                            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                                <GraduationCap className="w-8 h-8 text-primary" />
                            </div>
                        </div>
                        <h1 className="text-3xl font-bold">
                            {t('انضم كمعلم في أكاديمية أيمن', 'Join Ayman Academy as a Teacher')}
                        </h1>
                        <p className="text-muted-foreground max-w-lg mx-auto">
                            {t(
                                'أنشئ حسابك وأخبرنا عن نفسك. سنراجع طلبك وستتمكن من البدء بنشر موادك بعد الموافقة.',
                                'Create your account and tell us about yourself. We\'ll review your application and you can start publishing once approved.'
                            )}
                        </p>
                    </div>

                    {/* Form Card */}
                    <div className="bg-background rounded-xl shadow-sm border border-border p-6 sm:p-8">
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                            {/* Account Section */}
                            <div className="pb-4 border-b border-border">
                                <h2 className="text-base font-semibold mb-4">
                                    {t('بيانات الحساب', 'Account Details')}
                                </h2>
                                <div className="space-y-4">
                                    {/* Full Name */}
                                    <div className="space-y-2">
                                        <Label htmlFor="full_name">{t('الاسم الكامل', 'Full Name')} *</Label>
                                        <Input id="full_name" {...register('full_name')} />
                                        {errors.full_name && <p className="text-sm text-destructive">{errors.full_name.message}</p>}
                                    </div>

                                    {/* Email */}
                                    <div className="space-y-2">
                                        <Label htmlFor="email">{t('البريد الإلكتروني', 'Email')} *</Label>
                                        <Input id="email" type="email" dir="ltr" {...register('email')} />
                                        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
                                    </div>

                                    {/* Password */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">{t('كلمة المرور', 'Password')} *</Label>
                                            <div className="relative">
                                                <Input
                                                    id="password"
                                                    type={showPassword ? 'text' : 'password'}
                                                    dir="ltr"
                                                    {...register('password')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                    className="absolute top-1/2 -translate-y-1/2 end-3 text-muted-foreground hover:text-foreground"
                                                >
                                                    <PasswordIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                            {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="confirm_password">{t('تأكيد كلمة المرور', 'Confirm Password')} *</Label>
                                            <Input
                                                id="confirm_password"
                                                type={showPassword ? 'text' : 'password'}
                                                dir="ltr"
                                                {...register('confirm_password')}
                                            />
                                            {errors.confirm_password && <p className="text-sm text-destructive">{errors.confirm_password.message}</p>}
                                        </div>
                                    </div>

                                    {/* Phone */}
                                    <div className="space-y-2">
                                        <Label htmlFor="phone">{t('رقم الهاتف', 'Phone Number')} *</Label>
                                        <Input id="phone" type="tel" dir="ltr" {...register('phone')} />
                                        {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Professional Info Section */}
                            <div className="space-y-4">
                                <h2 className="text-base font-semibold">
                                    {t('المعلومات المهنية', 'Professional Info')}
                                </h2>

                                {/* Profession */}
                                <div className="space-y-2">
                                    <Label htmlFor="profession">
                                        {t('مهنتك / ماذا تدرّس؟', 'Your Profession / What do you teach?')} *
                                    </Label>
                                    <Input id="profession" {...register('profession')} />
                                    {errors.profession && <p className="text-sm text-destructive">{errors.profession.message}</p>}
                                </div>

                                {/* Major */}
                                <div className="space-y-2">
                                    <Label htmlFor="major">{t('تخصصك الجامعي', 'Your University Major')}</Label>
                                    <Input id="major" {...register('major')} />
                                </div>

                                {/* Bio */}
                                <div className="space-y-2">
                                    <Label htmlFor="bio">{t('نبذة عنك', 'About You')} *</Label>
                                    <Textarea
                                        id="bio"
                                        rows={4}
                                        placeholder={t(
                                            'أخبرنا عن نفسك وخبرتك التعليمية...',
                                            'Tell us about yourself and your teaching experience...'
                                        )}
                                        {...register('bio')}
                                    />
                                    {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
                                </div>

                                {/* Grades Taught */}
                                <div className="space-y-3">
                                    <Label>{t('المراحل التي تدرّسها', 'Grades You Teach')} *</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        {GRADE_OPTIONS.map((grade) => (
                                            <label
                                                key={grade.value}
                                                className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-muted/50 transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                                            >
                                                <Checkbox
                                                    checked={selectedGrades.includes(grade.value)}
                                                    onCheckedChange={(checked) =>
                                                        handleGradeToggle(grade.value, !!checked)
                                                    }
                                                />
                                                <span className="text-sm font-medium">
                                                    {language === 'ar' ? grade.ar : grade.en}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    {errors.grades_taught && <p className="text-sm text-destructive">{errors.grades_taught.message}</p>}
                                </div>
                            </div>

                            {/* Submit */}
                            <Button type="submit" className="w-full h-12 text-base" disabled={submitting}>
                                {submitting ? (
                                    <>
                                        <Loader2 className="w-5 h-5 animate-spin me-2" />
                                        {t('جارٍ إنشاء الحساب...', 'Creating account...')}
                                    </>
                                ) : (
                                    t('إنشاء الحساب وإرسال الطلب', 'Create Account & Submit Application')
                                )}
                            </Button>
                        </form>
                    </div>

                    {/* Footer note */}
                    <p className="text-center text-sm text-muted-foreground mt-6">
                        {t('لديك حساب بالفعل؟', 'Already have an account?')}{' '}
                        <Link to="/login" className="text-primary hover:underline font-medium">
                            {t('تسجيل الدخول', 'Sign In')}
                        </Link>
                    </p>
                </div>
            </div>
        </Layout>
    );
}
