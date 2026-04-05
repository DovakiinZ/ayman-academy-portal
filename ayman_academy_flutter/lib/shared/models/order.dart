import 'subject.dart';
import 'profile.dart';

class Order {
  final String id;
  final String studentId;
  final String subjectId;
  final String teacherId;
  final String status;
  final double amount;
  final String currency;
  final String studentFullName;
  final String studentPaymentAccount;
  final String? teacherNotes;
  final String? paidAt;
  final String createdAt;
  final Subject? subject;
  final Profile? teacher;
  final Profile? student;

  const Order({
    required this.id,
    required this.studentId,
    required this.subjectId,
    required this.teacherId,
    this.status = 'pending_payment',
    this.amount = 0,
    this.currency = 'SYP',
    this.studentFullName = '',
    this.studentPaymentAccount = '',
    this.teacherNotes,
    this.paidAt,
    required this.createdAt,
    this.subject,
    this.teacher,
    this.student,
  });

  factory Order.fromJson(Map<String, dynamic> json) => Order(
    id: json['id'] as String? ?? '',
    studentId: json['student_id'] as String? ?? '',
    subjectId: json['subject_id'] as String? ?? '',
    teacherId: json['teacher_id'] as String? ?? '',
    status: json['status'] as String? ?? 'pending_payment',
    amount: (json['amount'] as num?)?.toDouble() ?? 0,
    currency: json['currency'] as String? ?? 'SYP',
    studentFullName: json['student_full_name'] as String? ?? '',
    studentPaymentAccount: json['student_payment_account'] as String? ?? '',
    teacherNotes: json['teacher_notes'] as String?,
    paidAt: json['paid_at'] as String?,
    createdAt: json['created_at'] as String? ?? '',
    subject: json['subject'] != null
        ? Subject.fromJson(json['subject'] as Map<String, dynamic>)
        : null,
    teacher: json['teacher'] != null
        ? Profile.fromJson(json['teacher'] as Map<String, dynamic>)
        : null,
    student: json['student'] != null
        ? Profile.fromJson(json['student'] as Map<String, dynamic>)
        : null,
  );
}
