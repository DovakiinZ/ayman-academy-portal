import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';
import 'package:ayman_academy_app/shared/widgets/lesson_block_renderer.dart';
import 'package:ayman_academy_app/shared/widgets/loading_shimmer.dart';
import 'package:ayman_academy_app/features/student/lessons/providers/lesson_provider.dart';

class LessonPlayerScreen extends ConsumerStatefulWidget {
  final String lessonId;

  const LessonPlayerScreen({super.key, required this.lessonId});

  @override
  ConsumerState<LessonPlayerScreen> createState() => _LessonPlayerScreenState();
}

class _LessonPlayerScreenState extends ConsumerState<LessonPlayerScreen> {
  final ScrollController _scrollController = ScrollController();
  double _scrollProgress = 0.0;
  Timer? _progressTimer;
  bool _completed = false;

  @override
  void initState() {
    super.initState();
    _scrollController.addListener(_onScroll);
    _progressTimer = Timer.periodic(const Duration(seconds: 30), (_) => _saveProgress());
  }

  @override
  void dispose() {
    _saveProgress(); // Save on exit
    _progressTimer?.cancel();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    final maxScroll = _scrollController.position.maxScrollExtent;
    final current = _scrollController.position.pixels;
    if (maxScroll > 0) {
      setState(() => _scrollProgress = (current / maxScroll * 100).clamp(0, 100));
    }
  }

  Future<void> _saveProgress() async {
    final percent = _scrollProgress.round();
    await LessonProgressService.saveProgress(
      lessonId: widget.lessonId,
      progressPercent: percent,
    );

    if (percent >= 90 && !_completed) {
      final justCompleted = await LessonProgressService.markComplete(widget.lessonId);
      if (justCompleted && mounted) {
        setState(() => _completed = true);
        _showCompletionToast();
      }
    }
  }

  void _showCompletionToast() {
    final t = ref.read(languageProvider.notifier).t;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Row(
          children: [
            const Icon(Icons.celebration, color: Colors.white),
            const SizedBox(width: 8),
            Expanded(child: Text(t('أحسنت! أكملت الدرس +50 XP', 'Well done! Lesson complete +50 XP'))),
          ],
        ),
        backgroundColor: AppColors.success,
        duration: const Duration(seconds: 3),
      ),
    );
  }

  void _showNotesSheet() {
    final t = ref.read(languageProvider.notifier).t;
    final noteController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(t('ملاحظاتي', 'My Notes'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              TextField(
                controller: noteController,
                maxLines: 3,
                decoration: InputDecoration(hintText: t('اكتب ملاحظة...', 'Write a note...')),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () async {
                  if (noteController.text.trim().isEmpty) return;
                  await LessonProgressService.addNote(
                    lessonId: widget.lessonId,
                    content: noteController.text.trim(),
                  );
                  ref.invalidate(lessonNotesProvider(widget.lessonId));
                  if (ctx.mounted) Navigator.pop(ctx);
                },
                child: Text(t('حفظ', 'Save')),
              ),
              const SizedBox(height: 8),
              // Existing notes
              Consumer(
                builder: (_, ref, __) {
                  final notesAsync = ref.watch(lessonNotesProvider(widget.lessonId));
                  return notesAsync.when(
                    loading: () => const SizedBox.shrink(),
                    error: (_, __) => const SizedBox.shrink(),
                    data: (notes) {
                      if (notes.isEmpty) return const SizedBox.shrink();
                      return Column(
                        children: [
                          const Divider(),
                          ...notes.take(5).map((n) => ListTile(
                            dense: true,
                            title: Text(n['content'] as String? ?? '', style: const TextStyle(fontSize: 13)),
                            trailing: IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18),
                              onPressed: () async {
                                await LessonProgressService.deleteNote(n['id'] as String);
                                ref.invalidate(lessonNotesProvider(widget.lessonId));
                              },
                            ),
                          )),
                        ],
                      );
                    },
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showCommentsSheet() {
    final t = ref.read(languageProvider.notifier).t;
    final commentController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (ctx) => Padding(
        padding: EdgeInsets.only(bottom: MediaQuery.of(ctx).viewInsets.bottom),
        child: Container(
          constraints: BoxConstraints(maxHeight: MediaQuery.of(ctx).size.height * 0.6),
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(t('التعليقات', 'Comments'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: commentController,
                      decoration: InputDecoration(hintText: t('أضف تعليق...', 'Add comment...')),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton(
                    icon: const Icon(Icons.send, color: AppColors.primary),
                    onPressed: () async {
                      if (commentController.text.trim().isEmpty) return;
                      await LessonProgressService.addComment(
                        lessonId: widget.lessonId,
                        content: commentController.text.trim(),
                      );
                      commentController.clear();
                      ref.invalidate(lessonCommentsProvider(widget.lessonId));
                    },
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Flexible(
                child: Consumer(
                  builder: (_, ref, __) {
                    final commentsAsync = ref.watch(lessonCommentsProvider(widget.lessonId));
                    return commentsAsync.when(
                      loading: () => const Center(child: CircularProgressIndicator()),
                      error: (e, _) => Text('$e'),
                      data: (comments) {
                        if (comments.isEmpty) {
                          return Center(child: Text(t('لا توجد تعليقات', 'No comments yet'), style: const TextStyle(color: AppColors.inkMuted)));
                        }
                        return ListView.builder(
                          shrinkWrap: true,
                          itemCount: comments.length,
                          itemBuilder: (_, i) {
                            final c = comments[i];
                            final user = c['user'] as Map<String, dynamic>?;
                            return ListTile(
                              dense: true,
                              leading: CircleAvatar(
                                radius: 14,
                                backgroundColor: AppColors.primary.withValues(alpha: 0.1),
                                child: Text(
                                  (user?['full_name'] as String? ?? '?')[0],
                                  style: const TextStyle(fontSize: 11, color: AppColors.primary),
                                ),
                              ),
                              title: Text(user?['full_name'] as String? ?? '', style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600)),
                              subtitle: Text(c['content'] as String? ?? '', style: const TextStyle(fontSize: 13)),
                            );
                          },
                        );
                      },
                    );
                  },
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showRatingDialog() {
    final t = ref.read(languageProvider.notifier).t;
    int selectedStars = 5;

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) => AlertDialog(
          title: Text(t('تقييم الدرس', 'Rate Lesson')),
          content: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(5, (i) => IconButton(
              icon: Icon(
                i < selectedStars ? Icons.star : Icons.star_border,
                color: AppColors.gold,
                size: 32,
              ),
              onPressed: () => setDialogState(() => selectedStars = i + 1),
            )),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx),
              child: Text(t('إلغاء', 'Cancel')),
            ),
            ElevatedButton(
              onPressed: () async {
                await LessonProgressService.rateLesson(
                  lessonId: widget.lessonId,
                  stars: selectedStars,
                );
                if (ctx.mounted) Navigator.pop(ctx);
                if (mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(content: Text(t('شكراً لتقييمك!', 'Thanks for rating!')), backgroundColor: AppColors.success),
                  );
                }
              },
              child: Text(t('تقييم', 'Rate')),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final lessonAsync = ref.watch(lessonDetailProvider(widget.lessonId));
    final blocksAsync = ref.watch(lessonBlocksProvider(widget.lessonId));

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: lessonAsync.when(
            data: (l) => Text(l?.title(lang) ?? '', style: const TextStyle(fontSize: 16)),
            loading: () => const Text('...'),
            error: (_, __) => const Text(''),
          ),
          actions: [
            IconButton(icon: const Icon(Icons.note_add_outlined), onPressed: _showNotesSheet, tooltip: t('ملاحظات', 'Notes')),
            IconButton(icon: const Icon(Icons.comment_outlined), onPressed: _showCommentsSheet, tooltip: t('تعليقات', 'Comments')),
            IconButton(icon: const Icon(Icons.star_outline), onPressed: _showRatingDialog, tooltip: t('تقييم', 'Rate')),
          ],
        ),
        body: Column(
          children: [
            // Progress bar
            LinearProgressIndicator(
              value: _scrollProgress / 100,
              backgroundColor: AppColors.border,
              valueColor: AlwaysStoppedAnimation(_scrollProgress >= 90 ? AppColors.success : AppColors.primary),
              minHeight: 3,
            ),

            // Content
            Expanded(
              child: blocksAsync.when(
                loading: () => const LoadingShimmer(),
                error: (e, _) => Center(child: Text('$e')),
                data: (blocks) {
                  if (blocks.isEmpty) {
                    return Center(child: Text(t('لا يوجد محتوى بعد', 'No content yet'), style: const TextStyle(color: AppColors.inkMuted)));
                  }
                  return ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(16),
                    itemCount: blocks.length,
                    itemBuilder: (context, index) {
                      return LessonBlockRenderer(block: blocks[index]);
                    },
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
