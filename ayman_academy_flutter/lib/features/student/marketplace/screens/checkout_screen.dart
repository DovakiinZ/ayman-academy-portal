import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/features/auth/providers/auth_provider.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/subjects/providers/subjects_provider.dart';
import 'package:ayman_academy_app/features/student/marketplace/providers/marketplace_provider.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  final String subjectId;
  const CheckoutScreen({super.key, required this.subjectId});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _accountController = TextEditingController();
  bool _submitting = false;
  bool _done = false;
  Map<String, dynamic>? _teacherPayment;

  @override
  void dispose() {
    _accountController.dispose();
    super.dispose();
  }

  Future<void> _loadTeacherPayment(String teacherId) async {
    if (_teacherPayment != null) return;
    final data = await supabase
        .from('profiles')
        .select('full_name, shamcash_account_name, shamcash_account_number')
        .eq('id', teacherId)
        .single();
    if (mounted) setState(() => _teacherPayment = data);
  }

  Future<void> _submitOrder(String teacherId, double amount, String currency) async {
    if (_accountController.text.trim().isEmpty) return;
    final profile = ref.read(authProvider).profile;
    setState(() => _submitting = true);
    try {
      await OrderService.createOrder(
        subjectId: widget.subjectId,
        teacherId: teacherId,
        amount: amount,
        currency: currency,
        studentFullName: profile?.fullName ?? '',
        studentPaymentAccount: _accountController.text.trim(),
      );
      setState(() => _done = true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final subjectAsync = ref.watch(subjectDetailProvider(widget.subjectId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('إتمام الشراء', 'Checkout'))),
        body: subjectAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (subject) {
            if (subject == null) return Center(child: Text(t('المادة غير موجودة', 'Subject not found')));

            if (subject.teacherId != null) _loadTeacherPayment(subject.teacherId!);

            if (_done) {
              return Center(
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.check_circle, size: 80, color: AppColors.success),
                      const SizedBox(height: 16),
                      Text(t('تم إرسال الطلب!', 'Order submitted!'), style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      Text(t('سيقوم المعلم بتأكيد الدفع', 'The teacher will confirm your payment'), style: const TextStyle(color: AppColors.inkMuted), textAlign: TextAlign.center),
                      const SizedBox(height: 24),
                      ElevatedButton(onPressed: () => Navigator.pop(context), child: Text(t('العودة', 'Go Back'))),
                    ],
                  ),
                ),
              );
            }

            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Order summary
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('ملخص الطلب', 'Order Summary'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          Text(subject.title(lang), style: const TextStyle(fontWeight: FontWeight.w500)),
                          const SizedBox(height: 8),
                          Text(
                            '${subject.priceAmount?.toInt() ?? 0} ${subject.priceCurrency ?? "SYP"}',
                            style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: AppColors.gold),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Payment instructions
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(t('تعليمات الدفع عبر ShamCash', 'ShamCash Payment Instructions'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          Text(t('حول المبلغ إلى الحساب التالي:', 'Transfer the amount to this account:'), style: const TextStyle(color: AppColors.inkMuted)),
                          const SizedBox(height: 12),
                          if (_teacherPayment != null) ...[
                            ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(t('اسم الحساب', 'Account Name')),
                              subtitle: Text(_teacherPayment!['shamcash_account_name'] as String? ?? '-', style: const TextStyle(fontWeight: FontWeight.w600)),
                            ),
                            ListTile(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text(t('رقم الحساب', 'Account Number')),
                              subtitle: Text(_teacherPayment!['shamcash_account_number'] as String? ?? '-', style: const TextStyle(fontWeight: FontWeight.w600)),
                              trailing: IconButton(
                                icon: const Icon(Icons.copy, size: 18),
                                onPressed: () {
                                  Clipboard.setData(ClipboardData(text: _teacherPayment!['shamcash_account_number'] as String? ?? ''));
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text(t('تم النسخ', 'Copied')), duration: const Duration(seconds: 1)),
                                  );
                                },
                              ),
                            ),
                          ] else
                            const Center(child: CircularProgressIndicator()),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 16),

                  // Student account
                  Text(t('رقم حسابك في ShamCash', 'Your ShamCash Account Number'), style: const TextStyle(fontWeight: FontWeight.w500)),
                  const SizedBox(height: 8),
                  TextField(
                    controller: _accountController,
                    keyboardType: TextInputType.number,
                    textDirection: TextDirection.ltr,
                    decoration: InputDecoration(hintText: t('أدخل رقم حسابك', 'Enter your account number')),
                  ),
                  const SizedBox(height: 24),

                  SizedBox(
                    height: 50,
                    child: ElevatedButton(
                      onPressed: (_submitting || _teacherPayment == null)
                          ? null
                          : () => _submitOrder(
                              subject.teacherId!,
                              subject.priceAmount ?? 0,
                              subject.priceCurrency ?? 'SYP',
                            ),
                      child: _submitting
                          ? const SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
                          : Text(t('تأكيد الطلب', 'Confirm Order'), style: const TextStyle(fontSize: 16)),
                    ),
                  ),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
