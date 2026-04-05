import 'package:ayman_academy_app/core/env.dart';

class Certificate {
  final String id;
  final String studentId;
  final String? subjectId;
  final String studentName;
  final String courseName;
  final String? subjectName;
  final double? score;
  final String issuedAt;
  final String verificationCode;
  final String? pdfUrl;
  final String status;
  final int version;
  final CertificateSnapshot? snapshotJson;

  const Certificate({
    required this.id,
    required this.studentId,
    this.subjectId,
    required this.studentName,
    required this.courseName,
    this.subjectName,
    this.score,
    required this.issuedAt,
    required this.verificationCode,
    this.pdfUrl,
    this.status = 'draft',
    this.version = 1,
    this.snapshotJson,
  });

  factory Certificate.fromJson(Map<String, dynamic> json) => Certificate(
    id: json['id'] as String? ?? '',
    studentId: json['student_id'] as String? ?? '',
    subjectId: json['subject_id'] as String?,
    studentName: json['student_name'] as String? ?? '',
    courseName: json['course_name'] as String? ?? '',
    subjectName: json['subject_name'] as String?,
    score: (json['score'] as num?)?.toDouble(),
    issuedAt: json['issued_at'] as String? ?? '',
    verificationCode: json['verification_code'] as String? ?? '',
    pdfUrl: json['pdf_url'] as String?,
    status: json['status'] as String? ?? 'draft',
    version: json['version'] as int? ?? 1,
    snapshotJson: json['snapshot_json'] != null
        ? CertificateSnapshot.fromJson(json['snapshot_json'] as Map<String, dynamic>)
        : null,
  );

  String get verifyUrl => '${Env.webAppUrl}/verify/$verificationCode';
}

class CertificateSnapshot {
  final String studentName;
  final String? gender;
  final String? studentStage;
  final String courseName;
  final double? score;
  final String completionDate;
  final String teacherName;
  final String signerName;
  final String? signerRole;

  const CertificateSnapshot({
    required this.studentName,
    this.gender,
    this.studentStage,
    required this.courseName,
    this.score,
    required this.completionDate,
    required this.teacherName,
    required this.signerName,
    this.signerRole,
  });

  factory CertificateSnapshot.fromJson(Map<String, dynamic> json) => CertificateSnapshot(
    studentName: json['student_name'] as String? ?? '',
    gender: json['gender'] as String?,
    studentStage: json['student_stage'] as String?,
    courseName: json['course_name'] as String? ?? '',
    score: (json['score'] as num?)?.toDouble(),
    completionDate: json['completion_date'] as String? ?? '',
    teacherName: json['teacher_name'] as String? ?? '',
    signerName: json['signer_name'] as String? ?? '',
    signerRole: json['signer_role'] as String?,
  );
}
