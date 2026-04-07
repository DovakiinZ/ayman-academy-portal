import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/features/student/profile/providers/profile_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/providers/theme_provider.dart';
import 'package:ayman_academy_app/shared/widgets/avatar_widget.dart';
import 'package:ayman_academy_app/shared/widgets/xp_progress_bar.dart';

class StudentProfileScreen extends ConsumerStatefulWidget {
  const StudentProfileScreen({super.key});

  @override
  ConsumerState<StudentProfileScreen> createState() => _StudentProfileScreenState();
}

class _StudentProfileScreenState extends ConsumerState<StudentProfileScreen> {
  late TextEditingController _nameController;
  String? _selectedGender;
  bool _saving = false;
  bool _uploading = false;

  @override
  void initState() {
    super.initState();
    final profile = ref.read(authProvider).profile;
    _nameController = TextEditingController(text: profile?.fullName ?? '');
    _selectedGender = profile?.gender;
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await ProfileService.updateStudentProfile(
        fullName: _nameController.text.trim(),
        gender: _selectedGender,
      );
      await ref.read(authProvider.notifier).refreshProfile();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(ref.read(languageProvider.notifier).t('تم الحفظ', 'Saved')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _pickAvatar() async {
    final picker = ImagePicker();
    final image = await picker.pickImage(source: ImageSource.gallery, maxWidth: 512, maxHeight: 512, imageQuality: 80);
    if (image == null) return;
    setState(() => _uploading = true);
    try {
      await ProfileService.uploadAvatar(image.path);
      await ref.read(authProvider.notifier).refreshProfile();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authProvider);
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider);
    final profile = auth.profile;

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
              child: Stack(
                children: [
                  _uploading
                      ? const CircleAvatar(radius: 48, child: CircularProgressIndicator())
                      : AvatarWidget(
                          name: profile?.fullName ?? '?',
                          imageUrl: profile?.avatarUrl,
                          radius: 48,
                        ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: InkWell(
                      onTap: _pickAvatar,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(color: AppColors.primary, shape: BoxShape.circle),
                        child: const Icon(Icons.camera_alt, color: Colors.white, size: 16),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 8),
            Center(child: Text(profile?.email ?? '', style: const TextStyle(color: AppColors.inkMuted))),
            const SizedBox(height: 16),

            // XP Progress
            const XPProgressBar(),
            const SizedBox(height: 16),

            // Name
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(labelText: t('الاسم الكامل', 'Full Name')),
            ),
            const SizedBox(height: 16),

            // Gender
            DropdownButtonFormField<String>(
              value: _selectedGender,
              decoration: InputDecoration(labelText: t('الجنس', 'Gender')),
              items: [
                DropdownMenuItem(value: 'male', child: Text(t('ذكر', 'Male'))),
                DropdownMenuItem(value: 'female', child: Text(t('أنثى', 'Female'))),
                DropdownMenuItem(value: 'unspecified', child: Text(t('غير محدد', 'Unspecified'))),
              ],
              onChanged: (v) => setState(() => _selectedGender = v),
            ),
            const SizedBox(height: 16),

            // Stage (read-only display)
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: AppColors.primary.withValues(alpha: 0.06),
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: AppColors.primary.withValues(alpha: 0.15)),
              ),
              child: Row(
                children: [
                  const Icon(Icons.school, color: AppColors.primary, size: 20),
                  const SizedBox(width: 12),
                  Text(
                    '${t("المرحلة", "Stage")}: ${_stageName(profile?.studentStage, t)}',
                    style: const TextStyle(fontWeight: FontWeight.w500),
                  ),
                ],
              ),
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

  String _stageName(String? stage, String Function(String, String) t) {
    switch (stage) {
      case 'kindergarten': return t('رياض الأطفال', 'Kindergarten');
      case 'primary': return t('ابتدائي', 'Primary');
      case 'middle': return t('إعدادي', 'Middle');
      case 'high': return t('ثانوي', 'High School');
      default: return t('غير محدد', 'Not set');
    }
  }
}
