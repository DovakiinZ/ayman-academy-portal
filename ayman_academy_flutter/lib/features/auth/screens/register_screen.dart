import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:ayman_academy_app/core/router/routes.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmController = TextEditingController();
  bool _loading = false;
  bool _obscurePassword = true;
  String? _error;
  bool _success = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    _confirmController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      await ref.read(authProvider.notifier).signUp(
        email: _emailController.text.trim(),
        password: _passwordController.text,
        fullName: _nameController.text.trim(),
      );
      setState(() => _success = true);
    } catch (e) {
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('إنشاء حساب', 'Create Account')),
        ),
        body: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: _success ? _buildSuccess(t) : _buildForm(t),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildSuccess(String Function(String, String) t) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        const Icon(Icons.check_circle, size: 80, color: AppColors.success),
        const SizedBox(height: 16),
        Text(
          t('تم إنشاء الحساب بنجاح!', 'Account created successfully!'),
          style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          t('يرجى تأكيد بريدك الإلكتروني ثم تسجيل الدخول', 'Please verify your email then sign in'),
          style: const TextStyle(color: AppColors.inkMuted),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 24),
        ElevatedButton(
          onPressed: () => context.go(Routes.login),
          child: Text(t('تسجيل الدخول', 'Sign In')),
        ),
      ],
    );
  }

  Widget _buildForm(String Function(String, String) t) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null)
            Container(
              padding: const EdgeInsets.all(12),
              margin: const EdgeInsets.only(bottom: 16),
              decoration: BoxDecoration(
                color: AppColors.error.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(_error!, style: const TextStyle(color: AppColors.error, fontSize: 13)),
            ),

          TextFormField(
            controller: _nameController,
            decoration: InputDecoration(
              labelText: t('الاسم الكامل', 'Full Name'),
              prefixIcon: const Icon(Icons.person_outlined),
            ),
            validator: (v) => (v == null || v.isEmpty) ? t('مطلوب', 'Required') : null,
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              labelText: t('البريد الإلكتروني', 'Email'),
              prefixIcon: const Icon(Icons.email_outlined),
            ),
            validator: (v) => (v == null || v.isEmpty) ? t('مطلوب', 'Required') : null,
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _passwordController,
            obscureText: _obscurePassword,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              labelText: t('كلمة المرور', 'Password'),
              prefixIcon: const Icon(Icons.lock_outlined),
              suffixIcon: IconButton(
                icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility),
                onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
              ),
            ),
            validator: (v) {
              if (v == null || v.isEmpty) return t('مطلوب', 'Required');
              if (v.length < 6) return t('6 أحرف على الأقل', 'At least 6 characters');
              return null;
            },
          ),
          const SizedBox(height: 16),

          TextFormField(
            controller: _confirmController,
            obscureText: true,
            textDirection: TextDirection.ltr,
            decoration: InputDecoration(
              labelText: t('تأكيد كلمة المرور', 'Confirm Password'),
              prefixIcon: const Icon(Icons.lock_outlined),
            ),
            validator: (v) {
              if (v != _passwordController.text) return t('كلمة المرور غير متطابقة', 'Passwords do not match');
              return null;
            },
          ),
          const SizedBox(height: 24),

          SizedBox(
            height: 50,
            child: ElevatedButton(
              onPressed: _loading ? null : _submit,
              child: _loading
                  ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                  : Text(t('إنشاء حساب', 'Create Account'), style: const TextStyle(fontSize: 16)),
            ),
          ),
          const SizedBox(height: 16),

          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(t('لديك حساب بالفعل؟', 'Already have an account?')),
              TextButton(
                onPressed: () => context.go(Routes.login),
                child: Text(t('تسجيل الدخول', 'Sign In'), style: const TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
