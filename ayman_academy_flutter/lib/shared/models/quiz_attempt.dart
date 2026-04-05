class QuizAttempt {
  final String id;
  final String quizId;
  final String studentId;
  final double scorePercent;
  final bool passed;
  final Map<String, dynamic>? answers;
  final String? completedAt;

  const QuizAttempt({
    required this.id,
    required this.quizId,
    required this.studentId,
    this.scorePercent = 0,
    this.passed = false,
    this.answers,
    this.completedAt,
  });

  factory QuizAttempt.fromJson(Map<String, dynamic> json) => QuizAttempt(
    id: json['id'] as String? ?? '',
    quizId: json['quiz_id'] as String? ?? '',
    studentId: json['student_id'] as String? ?? '',
    scorePercent: (json['score_percent'] as num?)?.toDouble() ?? 0,
    passed: json['passed'] as bool? ?? false,
    answers: json['answers'] as Map<String, dynamic>?,
    completedAt: json['completed_at'] as String?,
  );
}
