import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';

class TeacherProfileScreen extends ConsumerStatefulWidget {
  const TeacherProfileScreen({super.key});

  @override
  ConsumerState<TeacherProfileScreen> createState() => _TeacherProfileScreenState();
}

class _TeacherProfileScreenState extends ConsumerState<TeacherProfileScreen> {
  late TextEditingController _nameController;
  late TextEditingController _bioArController;
  late TextEditingController _shamcashNameController;
  late TextEditingController _shamcashNumberController;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authProvider).profile;
    _nameController = TextEditingController(text: profile?.fullName ?? '');
    _bioArController = TextEditingController(text: profile?.bioAr ?? '');
    _shamcashNameController = TextEditingController(text: profile?.shamcashAccountName ?? '');
    _shamcashNumberController = TextEditingController(text: profile?.shamcashAccountNumber ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _bioArController.dispose();
    _shamcashNameController.dispose();
    _shamcashNumberController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await supabase.from('profiles').update({
        'full_name': _nameController.text.trim(),
        'bio_ar': _bioArController.text.trim(),
        'shamcash_account_name': _shamcashNameController.text.trim(),
        'shamcash_account_number': _shamcashNumberController.text.trim(),
      }).eq('id', supabase.auth.currentUser!.id);
      await ref.read(authProvider.notifier).refreshProfile();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(languageProvider.notifier).t('تم الحفظ', 'Saved')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final auth = ref.watch(authProvider);

    return Directionality(
      textDirection: lang.languageCode == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(t('ملفي الشخصي', 'My Profile')),
          actions: [
            TextButton(
              onPressed: _saving ? null : _save,
              child: _saving
                  ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : Text(t('حفظ', 'Save')),
            ),
          ],
        ),
        body: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Avatar
            Center(
              child: CircleAvatar(
                radius: 48,
                backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                child: Text(
                  (auth.profile?.fullName ?? '?')[0].toUpperCase(),
                  style: const TextStyle(fontSize: 32, fontWeight: FontWeight.bold, color: AppColors.primary),
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Name
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(labelText: t('الاسم الكامل', 'Full Name')),
            ),
            const SizedBox(height: 16),

            // Bio
            TextFormField(
              controller: _bioArController,
              maxLines: 3,
              decoration: InputDecoration(labelText: t('نبذة عني', 'Bio')),
            ),
            const SizedBox(height: 24),

            // ShamCash section
            Text(t('بيانات ShamCash', 'ShamCash Details'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(t('مطلوبة لاستقبال مدفوعات الطلاب', 'Required to receive student payments'), style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
            const SizedBox(height: 12),
            TextFormField(
              controller: _shamcashNameController,
              decoration: InputDecoration(labelText: t('اسم الحساب', 'Account Name')),
            ),
            const SizedBox(height: 12),
            TextFormField(
              controller: _shamcashNumberController,
              keyboardType: TextInputType.number,
              textDirection: TextDirection.ltr,
              decoration: InputDecoration(labelText: t('رقم الحساب', 'Account Number')),
            ),
            const SizedBox(height: 24),

            // Settings
            Card(
              child: Column(
                children: [
                  ListTile(
                    leading: const Icon(Icons.language),
                    title: Text(t('اللغة', 'Language')),
                    trailing: Text(lang.languageCode == 'ar' ? 'العربية' : 'English'),
                    onTap: () => ref.read(languageProvider.notifier).toggle(),
                  ),
                  const Divider(height: 1),
                  ListTile(
                    leading: const Icon(Icons.dark_mode),
                    title: Text(t('الوضع الداكن', 'Dark Mode')),
                    trailing: Switch(
                      value: ref.watch(themeProvider) == ThemeMode.dark,
                      onChanged: (_) => ref.read(themeProvider.notifier).toggle(),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Sign out
            SizedBox(
              width: double.infinity,
              child: OutlinedButton.icon(
                onPressed: () => ref.read(authProvider.notifier).signOut(),
                icon: const Icon(Icons.logout, color: AppColors.error),
                label: Text(t('تسجيل الخروج', 'Sign Out'), style: const TextStyle(color: AppColors.error)),
                style: OutlinedButton.styleFrom(
                  side: const BorderSide(color: AppColors.error),
                  padding: const EdgeInsets.symmetric(vertical: 14),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}
