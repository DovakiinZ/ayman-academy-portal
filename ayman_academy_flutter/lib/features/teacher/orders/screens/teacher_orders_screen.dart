import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/order.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';

final _teacherOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('orders')
      .select('*, student:profiles!student_id(full_name, email), subject:subjects(title_ar, title_en)')
      .eq('teacher_id', userId)
      .order('created_at', ascending: false);
  return (data as List).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

class TeacherOrdersScreen extends ConsumerWidget {
  const TeacherOrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final ordersAsync = ref.watch(_teacherOrdersProvider);

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text(t('الطلبات', 'Orders'))),
        body: ordersAsync.when(
          loading: () => const LoadingShimmer(),
          error: (e, _) => Center(child: Text('$e')),
          data: (orders) {
            if (orders.isEmpty) {
              return Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const Icon(Icons.receipt_long, size: 64, color: AppColors.inkMuted),
                    const SizedBox(height: 16),
                    Text(t('لا توجد طلبات', 'No orders yet'), style: const TextStyle(color: AppColors.inkMuted)),
                  ],
                ),
              );
            }
            return RefreshIndicator(
              onRefresh: () async => ref.invalidate(_teacherOrdersProvider),
              child: ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: orders.length,
                itemBuilder: (context, index) {
                  final o = orders[index];
                  return _OrderCard(order: o, t: t, lang: lang, ref: ref);
                },
              ),
            );
          },
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  final Order order;
  final String Function(String, String) t;
  final String lang;
  final WidgetRef ref;

  const _OrderCard({required this.order, required this.t, required this.lang, required this.ref});

  Color _statusColor(String status) {
    switch (status) {
      case 'paid': return AppColors.success;
      case 'rejected': return AppColors.error;
      case 'cancelled': return AppColors.inkMuted;
      default: return AppColors.warning;
    }
  }

  String _statusLabel(String status, String Function(String, String) t) {
    switch (status) {
      case 'pending_payment': return t('بانتظار الدفع', 'Pending Payment');
      case 'paid': return t('مدفوع', 'Paid');
      case 'rejected': return t('مرفوض', 'Rejected');
      case 'cancelled': return t('ملغي', 'Cancelled');
      default: return status;
    }
  }

  Future<void> _confirmPayment(BuildContext context) async {
    try {
      await supabase.from('orders').update({
        'status': 'paid',
        'paid_at': DateTime.now().toIso8601String(),
      }).eq('id', order.id);
      ref.invalidate(_teacherOrdersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('تم تأكيد الدفع', 'Payment confirmed')), backgroundColor: AppColors.success),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  Future<void> _rejectOrder(BuildContext context) async {
    try {
      await supabase.from('orders').update({
        'status': 'rejected',
        'teacher_notes': 'Rejected by teacher',
      }).eq('id', order.id);
      ref.invalidate(_teacherOrdersProvider);
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('تم رفض الطلب', 'Order rejected')), backgroundColor: AppColors.error),
        );
      }
    } catch (e) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('$e'), backgroundColor: AppColors.error),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Status badge + subject
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: _statusColor(order.status).withValues(alpha: 0.1),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    _statusLabel(order.status, t),
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: _statusColor(order.status)),
                  ),
                ),
                const Spacer(),
                Text(
                  '${order.amount.toInt()} ${order.currency}',
                  style: const TextStyle(fontWeight: FontWeight.bold, color: AppColors.gold),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Student info
            Text(order.studentFullName, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
              '${t("حساب ShamCash", "ShamCash Account")}: ${order.studentPaymentAccount}',
              style: const TextStyle(fontSize: 12, color: AppColors.inkMuted),
            ),

            // Actions for pending orders
            if (order.status == 'pending_payment') ...[
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      onPressed: () => _confirmPayment(context),
                      icon: const Icon(Icons.check, size: 18),
                      label: Text(t('تأكيد الدفع', 'Confirm')),
                      style: ElevatedButton.styleFrom(backgroundColor: AppColors.success),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton.icon(
                      onPressed: () => _rejectOrder(context),
                      icon: const Icon(Icons.close, size: 18, color: AppColors.error),
                      label: Text(t('رفض', 'Reject'), style: const TextStyle(color: AppColors.error)),
                      style: OutlinedButton.styleFrom(side: const BorderSide(color: AppColors.error)),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}
