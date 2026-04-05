class StudentLevel {
  final String studentId;
  final int totalXp;
  final String currentLevel;
  final int streakDays;
  final String? lastActivityDate;

  const StudentLevel({
    required this.studentId,
    this.totalXp = 0,
    this.currentLevel = 'beginner',
    this.streakDays = 0,
    this.lastActivityDate,
  });

  static const levelThresholds = {
    'expert': 5000,
    'scholar': 2000,
    'learner': 500,
    'beginner': 0,
  };

  static const levelIcons = {
    'beginner': '🌱',
    'learner': '📚',
    'scholar': '🎓',
    'expert': '🏆',
  };

  static const levelNamesAr = {
    'beginner': 'مبتدئ',
    'learner': 'متعلم',
    'scholar': 'دارس',
    'expert': 'خبير',
  };

  String get icon => levelIcons[currentLevel] ?? '🌱';
  String get nameAr => levelNamesAr[currentLevel] ?? 'مبتدئ';

  double get progressToNext {
    final thresholds = levelThresholds.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final currentIdx = thresholds.indexWhere((e) => e.key == currentLevel);
    if (currentIdx == 0) return 1.0;
    final current = thresholds[currentIdx].value;
    final next = thresholds[currentIdx - 1].value;
    return ((totalXp - current) / (next - current)).clamp(0.0, 1.0);
  }

  int get xpToNextLevel {
    final thresholds = levelThresholds.entries.toList()
      ..sort((a, b) => b.value.compareTo(a.value));
    final currentIdx = thresholds.indexWhere((e) => e.key == currentLevel);
    if (currentIdx == 0) return 0;
    return thresholds[currentIdx - 1].value - totalXp;
  }

  factory StudentLevel.fromJson(Map<String, dynamic> json) => StudentLevel(
    studentId: json['student_id'] as String? ?? '',
    totalXp: json['total_xp'] as int? ?? 0,
    currentLevel: json['current_level'] as String? ?? 'beginner',
    streakDays: json['streak_days'] as int? ?? 0,
    lastActivityDate: json['last_activity_date'] as String?,
  );
}
