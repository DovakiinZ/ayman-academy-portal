class LessonProgress {
  final String id;
  final String userId;
  final String lessonId;
  final int progressPercent;
  final int lastPositionSeconds;
  final String? completedAt;
  final String updatedAt;

  const LessonProgress({
    required this.id,
    required this.userId,
    required this.lessonId,
    this.progressPercent = 0,
    this.lastPositionSeconds = 0,
    this.completedAt,
    required this.updatedAt,
  });

  factory LessonProgress.fromJson(Map<String, dynamic> json) => LessonProgress(
    id: json['id'] as String? ?? '',
    userId: json['user_id'] as String? ?? '',
    lessonId: json['lesson_id'] as String? ?? '',
    progressPercent: json['progress_percent'] as int? ?? 0,
    lastPositionSeconds: json['last_position_seconds'] as int? ?? 0,
    completedAt: json['completed_at'] as String?,
    updatedAt: json['updated_at'] as String? ?? '',
  );

  bool get isCompleted => completedAt != null;
}
