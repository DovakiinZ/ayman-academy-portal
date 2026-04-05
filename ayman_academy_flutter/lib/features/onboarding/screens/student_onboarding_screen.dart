import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class StudentOnboardingScreen extends ConsumerStatefulWidget {
  const StudentOnboardingScreen({super.key});

  @override
  ConsumerState<StudentOnboardingScreen> createState() => _StudentOnboardingScreenState();
}

class _StudentOnboardingScreenState extends ConsumerState<StudentOnboardingScreen> {
  String? _selectedStage;
  bool _loading = false;

  final _stages = [
    {'key': 'kindergarten', 'ar': 'رياض الأطفال', 'en': 'Kindergarten', 'icon': Icons.child_care},
    {'key': 'primary', 'ar': 'المرحلة الابتدائية', 'en': 'Primary', 'icon': Icons.auto_stories},
    {'key': 'middle', 'ar': 'المرحلة الإعدادية', 'en': 'Middle School', 'icon': Icons.school},
    {'key': 'high', 'ar': 'المرحلة الثانوية', 'en': 'High School', 'icon': Icons.workspace_premium},
  ];

  Future<void> _submit() async {
    if (_selectedStage == null) return;
    setState(() => _loading = true);
    try {
      final userId = supabase.auth.currentUser!.id;
      await supabase.from('profiles').update({
        'student_stage': _selectedStage,
      }).eq('id', userId);
      await ref.read(authProvider.notifier).refreshProfile();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: AppColors.error),
        );
      }
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
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              children: [
                const SizedBox(height: 40),
                const Icon(Icons.school, size: 64, color: AppColors.primary),
                const SizedBox(height: 16),
                Text(
                  t('مرحباً بك!', 'Welcome!'),
                  style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                Text(
                  t('اختر مرحلتك الدراسية', 'Select your educational stage'),
                  style: const TextStyle(fontSize: 16, color: AppColors.inkMuted),
                ),
                const SizedBox(height: 32),
                Expanded(
                  child: ListView.separated(
                    itemCount: _stages.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 12),
                    itemBuilder: (context, index) {
                      final stage = _stages[index];
                      final isSelected = _selectedStage == stage['key'];
                      return InkWell(
                        onTap: () => setState(() => _selectedStage = stage['key'] as String),
                        borderRadius: BorderRadius.circular(12),
                        child: Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: isSelected ? AppColors.primary.withValues(alpha: 0.08) : AppColors.surface,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: isSelected ? AppColors.primary : AppColors.border,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            children: [
                              Icon(stage['icon'] as IconData, size: 32, color: isSelected ? AppColors.primary : AppColors.inkMuted),
                              const SizedBox(width: 16),
                              Expanded(
                                child: Text(
                                  t(stage['ar'] as String, stage['en'] as String),
                                  style: TextStyle(
                                    fontSize: 16,
                                    fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                                    color: isSelected ? AppColors.primary : AppColors.ink,
                                  ),
                                ),
                              ),
                              if (isSelected)
                                const Icon(Icons.check_circle, color: AppColors.primary),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: (_selectedStage != null && !_loading) ? _submit : null,
                    child: _loading
                        ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                        : Text(t('متابعة', 'Continue'), style: const TextStyle(fontSize: 16)),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
