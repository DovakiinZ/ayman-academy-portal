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
    {'key': 'kindergarten', 'ar': 'رياض الأطفال', 'en': 'Kindergarten', 'icon': Icons.child_care, 'color': Color(0xFFEC4899)},
    {'key': 'primary', 'ar': 'المرحلة الابتدائية', 'en': 'Primary', 'icon': Icons.auto_stories, 'color': Color(0xFF3B82F6)},
    {'key': 'middle', 'ar': 'المرحلة الإعدادية', 'en': 'Middle School', 'icon': Icons.school, 'color': Color(0xFF10B981)},
    {'key': 'high', 'ar': 'المرحلة الثانوية', 'en': 'High School', 'icon': Icons.workspace_premium, 'color': Color(0xFFF59E0B)},
  ];

  Future<void> _submit() async {
    if (_selectedStage == null) return;
    setState(() => _loading = true);
    try {
      final userId = supabase.auth.currentUser?.id;
      if (userId == null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Please log in to continue')),
          );
        }
        return;
      }
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
        body: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [AppColors.primary, AppColors.background],
              stops: [0.0, 0.4],
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                children: [
                  const SizedBox(height: 20),
                  // Header
                  Container(
                    width: 72,
                    height: 72,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                      boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.1), blurRadius: 16)],
                    ),
                    child: const Icon(Icons.school, size: 36, color: AppColors.primary),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    t('مرحباً بك!', 'Welcome!'),
                    style: const TextStyle(fontSize: 26, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    t('اختر مرحلتك الدراسية للبدء', 'Select your stage to get started'),
                    style: const TextStyle(fontSize: 15, color: Colors.white70),
                  ),
                  const SizedBox(height: 32),

                  // Stage cards
                  Expanded(
                    child: ListView.separated(
                      itemCount: _stages.length,
                      separatorBuilder: (_, _) => const SizedBox(height: 12),
                      itemBuilder: (context, index) {
                        final stage = _stages[index];
                        final isSelected = _selectedStage == stage['key'];
                        final color = stage['color'] as Color;
                        return AnimatedContainer(
                          duration: const Duration(milliseconds: 200),
                          child: Material(
                            color: Colors.transparent,
                            child: InkWell(
                              onTap: () => setState(() => _selectedStage = stage['key'] as String),
                              borderRadius: BorderRadius.circular(16),
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: isSelected ? color.withValues(alpha: 0.1) : Theme.of(context).cardColor,
                                  borderRadius: BorderRadius.circular(16),
                                  border: Border.all(
                                    color: isSelected ? color : AppColors.border,
                                    width: isSelected ? 2.5 : 1,
                                  ),
                                  boxShadow: isSelected ? [
                                    BoxShadow(color: color.withValues(alpha: 0.2), blurRadius: 12, offset: const Offset(0, 4)),
                                  ] : [
                                    BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 8),
                                  ],
                                ),
                                child: Row(
                                  children: [
                                    Container(
                                      width: 48,
                                      height: 48,
                                      decoration: BoxDecoration(
                                        color: color.withValues(alpha: 0.12),
                                        borderRadius: BorderRadius.circular(14),
                                      ),
                                      child: Icon(stage['icon'] as IconData, size: 26, color: color),
                                    ),
                                    const SizedBox(width: 16),
                                    Expanded(
                                      child: Text(
                                        t(stage['ar'] as String, stage['en'] as String),
                                        style: TextStyle(
                                          fontSize: 16,
                                          fontWeight: isSelected ? FontWeight.w700 : FontWeight.w500,
                                          color: isSelected ? color : null,
                                        ),
                                      ),
                                    ),
                                    if (isSelected)
                                      Container(
                                        width: 28,
                                        height: 28,
                                        decoration: BoxDecoration(color: color, shape: BoxShape.circle),
                                        child: const Icon(Icons.check, color: Colors.white, size: 16),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Continue button
                  Container(
                    width: double.infinity,
                    height: 52,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(14),
                      gradient: _selectedStage != null
                          ? const LinearGradient(colors: [AppColors.primary, AppColors.primaryLight])
                          : null,
                      color: _selectedStage == null ? AppColors.border : null,
                    ),
                    child: ElevatedButton(
                      onPressed: (_selectedStage != null && !_loading) ? _submit : null,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.transparent,
                        shadowColor: Colors.transparent,
                        disabledBackgroundColor: Colors.transparent,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      child: _loading
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2.5, color: Colors.white))
                          : Text(
                              t('متابعة', 'Continue'),
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                                color: _selectedStage != null ? Colors.white : AppColors.inkMuted,
                              ),
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
