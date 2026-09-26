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
      .maybeSingle();
  if (data == null) return null;
  return Certificate.fromJson(data);
});

class CertificateService {
  static Future<Map<String, dynamic>> requestCertificate(String subjectId) async {
    try {
      // `request_certificate` does not exist in the database. The real
      // function is `issue_certificate(p_student_id, p_subject_id)` — the same
      // one the web client calls — and it takes the student explicitly.
      final studentId = supabase.auth.currentUser?.id;
      if (studentId == null) {
        return {'status': 'error', 'error': 'Not signed in'};
      }
      final result = await supabase.rpc('issue_certificate', params: {
        'p_student_id': studentId,
        'p_subject_id': subjectId,
      });
      if (result is Map) return Map<String, dynamic>.from(result);
      return {'status': 'error', 'error': 'Unexpected response'};
    } catch (e) {
      return {'status': 'error', 'error': e.toString()};
    }
  }
}
