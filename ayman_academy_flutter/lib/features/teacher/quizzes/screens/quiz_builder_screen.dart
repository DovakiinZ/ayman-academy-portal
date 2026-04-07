import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/quiz.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class QuizBuilderScreen extends ConsumerStatefulWidget {
  final String lessonId;
  final String lessonTitle;
  const QuizBuilderScreen({super.key, required this.lessonId, required this.lessonTitle});

  @override
  ConsumerState<QuizBuilderScreen> createState() => _QuizBuilderScreenState();
}

class _QuizBuilderScreenState extends ConsumerState<QuizBuilderScreen> {
  Quiz? _quiz;
  bool _loading = true;
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _loadQuiz();
  }

  Future<void> _loadQuiz() async {
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('quizzes')
          .select('*, quiz_questions(*)')
          .eq('lesson_id', widget.lessonId)
          .maybeSingle();
      if (data != null) {
        _quiz = Quiz.fromJson(data);
      }
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _createQuiz() async {
    setState(() => _saving = true);
    try {
      final data = await supabase.from('quizzes').insert({
        'lesson_id': widget.lessonId,
        'is_enabled': true,
        'is_required': false,
        'passing_score': 60,
        'attempts_allowed': 3,
      }).select().single();
      _quiz = Quiz.fromJson(data);
      setState(() {});
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showAddQuestionDialog() {
    final t = ref.read(languageProvider.notifier).t;
    final questionController = TextEditingController();
    final explanationController = TextEditingController();
    String type = 'mcq';
    List<String> options = ['', '', '', ''];
    int correctIndex = 0;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(t('سؤال جديد', 'New Question')),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Type selector
                SegmentedButton<String>(
                  segments: [
                    ButtonSegment(value: 'mcq', label: Text(t('اختيار', 'MCQ'))),
                    ButtonSegment(value: 'true_false', label: Text(t('صح/خطأ', 'T/F'))),
                  ],
                  selected: {type},
                  onSelectionChanged: (v) {
                    setDialogState(() {
                      type = v.first;
                      if (type == 'true_false') {
                        options = [t('صح', 'True'), t('خطأ', 'False')];
                        correctIndex = 0;
                      } else {
                        options = ['', '', '', ''];
                        correctIndex = 0;
                      }
                    });
                  },
                ),
                const SizedBox(height: 16),

                // Question text
                TextField(
                  controller: questionController,
                  maxLines: 2,
                  decoration: InputDecoration(labelText: t('نص السؤال', 'Question Text')),
                ),
                const SizedBox(height: 16),

                // Options
                if (type == 'mcq')
                  ...List.generate(options.length, (i) => Padding(
                    padding: const EdgeInsets.only(bottom: 8),
                    child: Row(
                      children: [
                        Radio<int>(
                          value: i,
                          groupValue: correctIndex,
                          onChanged: (v) => setDialogState(() => correctIndex = v!),
                          activeColor: AppColors.success,
                        ),
                        Expanded(
                          child: TextField(
                            decoration: InputDecoration(
                              hintText: '${t("خيار", "Option")} ${i + 1}',
                              isDense: true,
                            ),
                            onChanged: (v) => options[i] = v,
                          ),
                        ),
                      ],
                    ),
                  ))
                else
                  Column(
                    children: [
                      RadioListTile<int>(
                        title: Text(t('صح', 'True')),
                        value: 0,
                        groupValue: correctIndex,
                        onChanged: (v) => setDialogState(() => correctIndex = v!),
                      ),
                      RadioListTile<int>(
                        title: Text(t('خطأ', 'False')),
                        value: 1,
                        groupValue: correctIndex,
                        onChanged: (v) => setDialogState(() => correctIndex = v!),
                      ),
                    ],
                  ),

                const SizedBox(height: 12),
                TextField(
                  controller: explanationController,
                  maxLines: 2,
                  decoration: InputDecoration(labelText: t('شرح الإجابة (اختياري)', 'Explanation (optional)')),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('إلغاء', 'Cancel'))),
            ElevatedButton(
              onPressed: () async {
                if (questionController.text.trim().isEmpty) return;
                final filteredOptions = type == 'mcq'
                    ? options.where((o) => o.isNotEmpty).toList()
                    : options;
                if (filteredOptions.length < 2) return;

                try {
                  final nextOrder = (_quiz?.questions?.length ?? 0) + 1;
                  await supabase.from('quiz_questions').insert({
                    'quiz_id': _quiz!.id,
                    'type': type,
                    'question_ar': questionController.text.trim(),
                    'options': filteredOptions,
                    'correct_answer': filteredOptions[correctIndex],
                    'explanation_ar': explanationController.text.trim().isNotEmpty ? explanationController.text.trim() : null,
                    'sort_order': nextOrder,
                  });
                  Navigator.pop(ctx);
                  _loadQuiz();
                } catch (e) {
                  ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
                }
              },
              child: Text(t('إضافة', 'Add')),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteQuestion(String questionId) async {
    await supabase.from('quiz_questions').delete().eq('id', questionId);
    _loadQuiz();
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text('${t("اختبار", "Quiz")} - ${widget.lessonTitle}')),
        floatingActionButton: _quiz != null ? FloatingActionButton(
          onPressed: _showAddQuestionDialog,
          child: const Icon(Icons.add),
        ) : null,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : _quiz == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.quiz, size: 64, color: AppColors.inkMuted),
                        const SizedBox(height: 16),
                        Text(t('لا يوجد اختبار لهذا الدرس', 'No quiz for this lesson'), style: const TextStyle(color: AppColors.inkMuted)),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _saving ? null : _createQuiz,
                          icon: const Icon(Icons.add),
                          label: Text(t('إنشاء اختبار', 'Create Quiz')),
                        ),
                      ],
                    ),
                  )
                : ListView(
                    padding: const EdgeInsets.all(16),
                    children: [
                      // Quiz settings
                      Container(
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: AppColors.primary.withValues(alpha: 0.04),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: AppColors.border),
                        ),
                        child: Column(
                          children: [
                            Row(
                              children: [
                                const Icon(Icons.quiz, color: AppColors.primary),
                                const SizedBox(width: 8),
                                Text(t('إعدادات الاختبار', 'Quiz Settings'), style: const TextStyle(fontWeight: FontWeight.bold)),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Text('${t("درجة النجاح", "Pass score")}: ${_quiz!.passingScore}% | ${t("المحاولات", "Attempts")}: ${_quiz!.attemptsAllowed}',
                                style: const TextStyle(color: AppColors.inkMuted, fontSize: 13)),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),

                      Text('${t("الأسئلة", "Questions")} (${_quiz!.questions?.length ?? 0})', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),

                      if (_quiz!.questions == null || _quiz!.questions!.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          alignment: Alignment.center,
                          child: Text(t('اضغط + لإضافة سؤال', 'Tap + to add a question'), style: const TextStyle(color: AppColors.inkMuted)),
                        )
                      else
                        ...List.generate(_quiz!.questions!.length, (i) {
                          final q = _quiz!.questions![i];
                          return Card(
                            margin: const EdgeInsets.only(bottom: 12),
                            child: Padding(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      CircleAvatar(
                                        radius: 14,
                                        backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                                        child: Text('${i + 1}', style: const TextStyle(fontSize: 12, color: AppColors.primary)),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(
                                          color: AppColors.info.withValues(alpha: 0.1),
                                          borderRadius: BorderRadius.circular(4),
                                        ),
                                        child: Text(
                                          q.type == 'true_false' ? t('صح/خطأ', 'T/F') : t('اختيار', 'MCQ'),
                                          style: const TextStyle(fontSize: 10, color: AppColors.info),
                                        ),
                                      ),
                                      const Spacer(),
                                      IconButton(
                                        icon: const Icon(Icons.delete, size: 18, color: AppColors.error),
                                        onPressed: () => _deleteQuestion(q.id),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text(q.question(lang), style: const TextStyle(fontWeight: FontWeight.w500)),
                                  const SizedBox(height: 8),
                                  ...q.options.map((opt) => Padding(
                                    padding: const EdgeInsets.only(bottom: 4),
                                    child: Row(
                                      children: [
                                        Icon(
                                          opt == q.correctAnswer ? Icons.check_circle : Icons.radio_button_unchecked,
                                          size: 16,
                                          color: opt == q.correctAnswer ? AppColors.success : AppColors.inkMuted,
                                        ),
                                        const SizedBox(width: 6),
                                        Text(opt, style: TextStyle(
                                          fontSize: 13,
                                          color: opt == q.correctAnswer ? AppColors.success : null,
                                          fontWeight: opt == q.correctAnswer ? FontWeight.w600 : null,
                                        )),
                                      ],
                                    ),
                                  )),
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
                  ),
      ),
    );
  }
}
