import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/core/utils/date_formatter.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/lessons/providers/lesson_provider.dart';

class LessonNotesScreen extends ConsumerStatefulWidget {
  final String lessonId;
  final String lessonTitle;
  const LessonNotesScreen({super.key, required this.lessonId, required this.lessonTitle});

  @override
  ConsumerState<LessonNotesScreen> createState() => _LessonNotesScreenState();
}

class _LessonNotesScreenState extends ConsumerState<LessonNotesScreen> {
  final _noteController = TextEditingController();
  bool _adding = false;

  @override
  void dispose() {
    _noteController.dispose();
    super.dispose();
  }

  Future<void> _addNote() async {
    if (_noteController.text.trim().isEmpty) return;
    setState(() => _adding = true);
    try {
      await LessonProgressService.addNote(
        lessonId: widget.lessonId,
        content: _noteController.text.trim(),
      );
      _noteController.clear();
      ref.invalidate(lessonNotesProvider(widget.lessonId));
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _adding = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final notesAsync = ref.watch(lessonNotesProvider(widget.lessonId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(title: Text('${t("ملاحظات", "Notes")} - ${widget.lessonTitle}')),
        body: Column(
          children: [
            // Add note input
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Theme.of(context).scaffoldBackgroundColor,
                border: Border(bottom: BorderSide(color: AppColors.border)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _noteController,
                      maxLines: 2,
                      minLines: 1,
                      decoration: InputDecoration(
                        hintText: t('اكتب ملاحظة...', 'Write a note...'),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: _adding
                        ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                        : const Icon(Icons.add_circle, color: AppColors.primary, size: 32),
                    onPressed: _adding ? null : _addNote,
                  ),
                ],
              ),
            ),

            // Notes list
            Expanded(
              child: notesAsync.when(
                loading: () => const LoadingShimmer(),
                error: (e, _) => Center(child: Text('$e')),
                data: (notes) {
                  if (notes.isEmpty) {
                    return Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.note, size: 64, color: AppColors.inkMuted),
                          const SizedBox(height: 16),
                          Text(t('لا توجد ملاحظات', 'No notes yet'), style: const TextStyle(color: AppColors.inkMuted)),
                        ],
                      ),
                    );
                  }
                  return RefreshIndicator(
                    onRefresh: () async => ref.invalidate(lessonNotesProvider(widget.lessonId)),
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: notes.length,
                      itemBuilder: (context, index) {
                        final n = notes[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: Padding(
                            padding: const EdgeInsets.all(16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(n['content'] as String? ?? '', style: const TextStyle(fontSize: 14, height: 1.6)),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Text(
                                      timeAgo(n['created_at'] as String?, arabic: lang == 'ar'),
                                      style: const TextStyle(fontSize: 11, color: AppColors.inkMuted),
                                    ),
                                    const Spacer(),
                                    IconButton(
                                      icon: const Icon(Icons.delete_outline, size: 18, color: AppColors.error),
                                      onPressed: () async {
                                        await LessonProgressService.deleteNote(n['id'] as String);
                                        ref.invalidate(lessonNotesProvider(widget.lessonId));
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}
