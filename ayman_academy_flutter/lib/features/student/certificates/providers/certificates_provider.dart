import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/certificate.dart';

final myCertificatesProvider = FutureProvider<List<Certificate>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];
  final data = await supabase
      .from('certificates')
      .select('*')
      .eq('student_id', userId)
      .order('issued_at', ascending: false);
  return (data as List).map((e) => Certificate.fromJson(e as Map<String, dynamic>)).toList();
});

final certificateDetailProvider = FutureProvider.family<Certificate?, String>((ref, certId) async {
  final data = await supabase
      .from('certificates')
      .select('*')
      .eq('id', certId)
      .single();
  return Certificate.fromJson(data);
});

class CertificateService {
  static Future<Map<String, dynamic>> requestCertificate(String subjectId) async {
    try {
      final result = await supabase.rpc('request_certificate', params: {
        'p_subject_id': subjectId,
      });
      if (result is Map) return Map<String, dynamic>.from(result);
      return {'status': 'error', 'error': 'Unexpected response'};
    } catch (e) {
      return {'status': 'error', 'error': e.toString()};
    }
  }
}
