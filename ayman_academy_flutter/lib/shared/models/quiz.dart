import 'dart:convert';

class Quiz {
  final String id;
  final String? lessonId;
  final bool isEnabled;
  final bool isRequired;
  final int passingScore;
  final int attemptsAllowed;
  final int? unlockAfterPercent;
  final List<QuizQuestion>? questions;

  const Quiz({
    required this.id,
    this.lessonId,
    this.isEnabled = true,
    this.isRequired = false,
    this.passingScore = 60,
    this.attemptsAllowed = 3,
    this.unlockAfterPercent,
    this.questions,
  });

  factory Quiz.fromJson(Map<String, dynamic> json) => Quiz(
    id: json['id'] as String? ?? '',
    lessonId: json['lesson_id'] as String?,
    isEnabled: json['is_enabled'] as bool? ?? true,
    isRequired: json['is_required'] as bool? ?? false,
    passingScore: json['passing_score'] as int? ?? 60,
    attemptsAllowed: json['attempts_allowed'] as int? ?? 3,
    unlockAfterPercent: json['unlock_after_percent'] as int?,
    questions: (json['quiz_questions'] as List<dynamic>?)
        ?.map((e) => QuizQuestion.fromJson(e as Map<String, dynamic>))
        .toList(),
  );
}

class QuizQuestion {
  final String id;
  final String quizId;
  final String type;
  final String questionAr;
  final String? questionEn;
  final List<String> options;
  final String correctAnswer;
  final String? explanationAr;
  final String? explanationEn;
  final int sortOrder;

  const QuizQuestion({
    required this.id,
    required this.quizId,
    this.type = 'mcq',
    required this.questionAr,
    this.questionEn,
    required this.options,
    required this.correctAnswer,
    this.explanationAr,
    this.explanationEn,
    this.sortOrder = 0,
  });

  factory QuizQuestion.fromJson(Map<String, dynamic> json) => QuizQuestion(
    id: json['id'] as String? ?? '',
    quizId: json['quiz_id'] as String? ?? '',
    type: json['type'] as String? ?? 'mcq',
    questionAr: json['question_ar'] as String? ?? '',
    questionEn: json['question_en'] as String?,
    options: _parseOptions(json['options']),
    correctAnswer: json['correct_answer'] as String? ?? '',
    explanationAr: json['explanation_ar'] as String?,
    explanationEn: json['explanation_en'] as String?,
    sortOrder: json['sort_order'] as int? ?? 0,
  );

  static List<String> _parseOptions(dynamic raw) {
    if (raw == null) return [];
    if (raw is List) return raw.map((e) => e.toString()).toList();
    if (raw is String) {
      try {
        final decoded = jsonDecode(raw) as List;
        return decoded.map((e) => e.toString()).toList();
      } catch (_) {
        return [];
      }
    }
    return [];
  }

  String question(String lang) =>
      lang == 'ar' ? questionAr : (questionEn ?? questionAr);
  String? explanation(String lang) =>
      lang == 'ar' ? explanationAr : (explanationEn ?? explanationAr);
}
