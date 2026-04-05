import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/subject.dart';
import 'package:ayman_academy_app/shared/models/order.dart';

final marketplaceSubjectsProvider = FutureProvider<List<Subject>>((ref) async {
  final data = await supabase
      .from('subjects')
      .select('*, stage:stages(id, slug, title_ar, title_en), teacher:profiles!teacher_id(full_name, avatar_url)')
      .eq('is_active', true)
      .eq('is_paid', true)
      .order('sort_order');
  return (data as List).map((e) {
    final map = Map<String, dynamic>.from(e);
    if (map['teacher'] is Map) {
      map['teacher_name'] = map['teacher']['full_name'];
    }
    return Subject.fromJson(map);
  }).toList();
});

final studentOrdersProvider = FutureProvider<List<Order>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('orders')
      .select('*, subject:subjects(title_ar, title_en, cover_image_url)')
      .eq('student_id', userId)
      .order('created_at', ascending: false);
  return (data as List).map((e) => Order.fromJson(e as Map<String, dynamic>)).toList();
});

class OrderService {
  static Future<void> createOrder({
    required String subjectId,
    required String teacherId,
    required double amount,
    required String currency,
    required String studentFullName,
    required String studentPaymentAccount,
  }) async {
    await supabase.from('orders').insert({
      'student_id': supabase.auth.currentUser!.id,
      'subject_id': subjectId,
      'teacher_id': teacherId,
      'status': 'pending_payment',
      'amount': amount,
      'currency': currency,
      'student_full_name': studentFullName,
      'student_payment_account': studentPaymentAccount,
    });
  }
}
