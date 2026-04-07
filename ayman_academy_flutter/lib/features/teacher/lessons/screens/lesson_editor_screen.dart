import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/core/theme/app_colors.dart';
import 'package:ayman_academy_app/shared/models/lesson_block.dart';
import 'package:ayman_academy_app/shared/providers/language_provider.dart';

class LessonEditorScreen extends ConsumerStatefulWidget {
  final String subjectId;
  final String? lessonId; // null = create new
  const LessonEditorScreen({super.key, required this.subjectId, this.lessonId});

  @override
  ConsumerState<LessonEditorScreen> createState() => _LessonEditorScreenState();
}

class _LessonEditorScreenState extends ConsumerState<LessonEditorScreen> {
  final _titleArController = TextEditingController();
  final _titleEnController = TextEditingController();
  final _summaryController = TextEditingController();
  final _videoUrlController = TextEditingController();
  final _durationController = TextEditingController();
  bool _isPublished = false;
  bool _isPaid = false;
  bool _loading = false;
  bool _saving = false;
  List<LessonBlock> _blocks = [];

  @override
  void initState() {
    super.initState();
    if (widget.lessonId != null) _loadLesson();
  }

  Future<void> _loadLesson() async {
    setState(() => _loading = true);
    try {
      final data = await supabase
          .from('lessons')
          .select('*')
          .eq('id', widget.lessonId!)
          .single();
      _titleArController.text = data['title_ar'] ?? '';
      _titleEnController.text = data['title_en'] ?? '';
      _summaryController.text = data['summary_ar'] ?? '';
      _videoUrlController.text = data['video_url'] ?? '';
      _durationController.text = (data['duration_minutes'] ?? '').toString();
      _isPublished = data['is_published'] ?? false;
      _isPaid = data['is_paid'] ?? false;

      // Load blocks
      final blocksData = await supabase
          .from('lesson_blocks')
          .select('*')
          .eq('lesson_id', widget.lessonId!)
          .order('sort_order');
      _blocks = (blocksData as List).map((e) => LessonBlock.fromJson(e as Map<String, dynamic>)).toList();
    } catch (_) {}
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _saveLesson() async {
    if (_titleArController.text.trim().isEmpty) return;
    setState(() => _saving = true);
    final t = ref.read(languageProvider.notifier).t;

    try {
      final payload = {
        'subject_id': widget.subjectId,
        'title_ar': _titleArController.text.trim(),
        'title_en': _titleEnController.text.trim().isNotEmpty ? _titleEnController.text.trim() : null,
        'summary_ar': _summaryController.text.trim().isNotEmpty ? _summaryController.text.trim() : null,
        'video_url': _videoUrlController.text.trim().isNotEmpty ? _videoUrlController.text.trim() : null,
        'duration_minutes': int.tryParse(_durationController.text),
        'is_published': _isPublished,
        'is_paid': _isPaid,
        'created_by': supabase.auth.currentUser!.id,
      };

      if (widget.lessonId != null) {
        await supabase.from('lessons').update(payload).eq('id', widget.lessonId!);
      } else {
        // Get next sort order
        final existing = await supabase
            .from('lessons')
            .select('sort_order')
            .eq('subject_id', widget.subjectId)
            .order('sort_order', ascending: false)
            .limit(1);
        final nextOrder = (existing as List).isNotEmpty ? ((existing[0]['sort_order'] as int?) ?? 0) + 1 : 1;
        payload['sort_order'] = nextOrder;
        await supabase.from('lessons').insert(payload);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(t('تم الحفظ', 'Saved')), backgroundColor: AppColors.success),
        );
        Navigator.pop(context, true);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  void _showAddBlockSheet() {
    if (widget.lessonId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(ref.read(languageProvider.notifier).t('احفظ الدرس أولاً', 'Save lesson first')), backgroundColor: AppColors.warning),
      );
      return;
    }

    final t = ref.read(languageProvider.notifier).t;
    final blockTypes = [
      {'type': 'rich_text', 'label': t('نص', 'Text'), 'icon': Icons.text_fields},
      {'type': 'video', 'label': t('فيديو', 'Video'), 'icon': Icons.videocam},
      {'type': 'image', 'label': t('صورة', 'Image'), 'icon': Icons.image},
      {'type': 'tip', 'label': t('نصيحة', 'Tip'), 'icon': Icons.lightbulb},
      {'type': 'warning', 'label': t('تنبيه', 'Warning'), 'icon': Icons.warning},
      {'type': 'example', 'label': t('مثال', 'Example'), 'icon': Icons.auto_awesome},
      {'type': 'exercise', 'label': t('تمرين', 'Exercise'), 'icon': Icons.edit_note},
      {'type': 'equation', 'label': t('معادلة', 'Equation'), 'icon': Icons.functions},
      {'type': 'qa', 'label': t('سؤال وجواب', 'Q&A'), 'icon': Icons.quiz},
      {'type': 'link', 'label': t('رابط', 'Link'), 'icon': Icons.link},
    ];

    showModalBottomSheet(
      context: context,
      builder: (ctx) => Container(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(t('إضافة محتوى', 'Add Content'), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            const SizedBox(height: 16),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: blockTypes.map((bt) => ActionChip(
                avatar: Icon(bt['icon'] as IconData, size: 18),
                label: Text(bt['label'] as String),
                onPressed: () {
                  Navigator.pop(ctx);
                  _showBlockEditor(bt['type'] as String);
                },
              )).toList(),
            ),
          ],
        ),
      ),
    );
  }

  void _showBlockEditor(String type, [LessonBlock? existing]) {
    final t = ref.read(languageProvider.notifier).t;
    final contentController = TextEditingController(text: existing?.contentAr ?? '');
    final titleController = TextEditingController(text: existing?.titleAr ?? '');
    final urlController = TextEditingController(text: existing?.url ?? '');
    final needsUrl = ['video', 'image', 'file', 'link'].contains(type);
    final needsTitle = ['qa', 'equation', 'link', 'file'].contains(type);

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: Text(existing != null ? t('تعديل', 'Edit') : t('إضافة', 'Add')),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              if (needsTitle)
                TextField(
                  controller: titleController,
                  decoration: InputDecoration(labelText: t('العنوان', 'Title')),
                ),
              if (needsTitle) const SizedBox(height: 12),
              if (needsUrl)
                TextField(
                  controller: urlController,
                  textDirection: TextDirection.ltr,
                  decoration: const InputDecoration(labelText: 'URL'),
                ),
              if (needsUrl) const SizedBox(height: 12),
              TextField(
                controller: contentController,
                maxLines: 4,
                decoration: InputDecoration(labelText: t('المحتوى', 'Content')),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: Text(t('إلغاء', 'Cancel'))),
          ElevatedButton(
            onPressed: () async {
              try {
                final nextOrder = _blocks.isEmpty ? 1 : (_blocks.last.sortOrder + 1);
                final payload = {
                  'lesson_id': widget.lessonId,
                  'type': type,
                  'title_ar': titleController.text.trim().isNotEmpty ? titleController.text.trim() : null,
                  'content_ar': contentController.text.trim().isNotEmpty ? contentController.text.trim() : null,
                  'url': urlController.text.trim().isNotEmpty ? urlController.text.trim() : null,
                  'sort_order': existing?.sortOrder ?? nextOrder,
                  'is_published': true,
                };

                if (existing != null) {
                  await supabase.from('lesson_blocks').update(payload).eq('id', existing.id);
                } else {
                  await supabase.from('lesson_blocks').insert(payload);
                }
                Navigator.pop(ctx);
                _loadLesson(); // Refresh blocks
              } catch (e) {
                ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('$e'), backgroundColor: AppColors.error));
              }
            },
            child: Text(t('حفظ', 'Save')),
          ),
        ],
      ),
    );
  }

  Future<void> _deleteBlock(String blockId) async {
    await supabase.from('lesson_blocks').delete().eq('id', blockId);
    _loadLesson();
  }

  @override
  void dispose() {
    _titleArController.dispose();
    _titleEnController.dispose();
    _summaryController.dispose();
    _videoUrlController.dispose();
    _durationController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final t = ref.read(languageProvider.notifier).t;
    final lang = ref.watch(languageProvider).languageCode;
    final isEditing = widget.lessonId != null;

    return Directionality(
      textDirection: lang == 'ar' ? TextDirection.rtl : TextDirection.ltr,
      child: Scaffold(
        appBar: AppBar(
          title: Text(isEditing ? t('تعديل الدرس', 'Edit Lesson') : t('درس جديد', 'New Lesson')),
          actions: [
            TextButton.icon(
              onPressed: _saving ? null : _saveLesson,
              icon: _saving
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.save),
              label: Text(t('حفظ', 'Save')),
            ),
          ],
        ),
        floatingActionButton: isEditing ? FloatingActionButton(
          onPressed: _showAddBlockSheet,
          child: const Icon(Icons.add),
        ) : null,
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    // Lesson info
                    TextFormField(
                      controller: _titleArController,
                      decoration: InputDecoration(
                        labelText: t('عنوان الدرس بالعربية *', 'Lesson Title (Arabic) *'),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _titleEnController,
                      textDirection: TextDirection.ltr,
                      decoration: InputDecoration(
                        labelText: t('عنوان الدرس بالإنجليزية', 'Lesson Title (English)'),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _summaryController,
                      maxLines: 2,
                      decoration: InputDecoration(
                        labelText: t('ملخص الدرس', 'Lesson Summary'),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _videoUrlController,
                            textDirection: TextDirection.ltr,
                            decoration: InputDecoration(
                              labelText: t('رابط الفيديو', 'Video URL'),
                              prefixIcon: const Icon(Icons.videocam, size: 20),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                        const SizedBox(width: 12),
                        SizedBox(
                          width: 100,
                          child: TextFormField(
                            controller: _durationController,
                            keyboardType: TextInputType.number,
                            decoration: InputDecoration(
                              labelText: t('المدة (د)', 'Min'),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),

                    // Toggles
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: AppColors.border),
                      ),
                      child: Column(
                        children: [
                          Row(
                            children: [
                              Expanded(child: Text(t('منشور', 'Published'))),
                              Switch(value: _isPublished, onChanged: (v) => setState(() => _isPublished = v)),
                            ],
                          ),
                          Row(
                            children: [
                              Expanded(child: Text(t('مدفوع', 'Paid'))),
                              Switch(value: _isPaid, onChanged: (v) => setState(() => _isPaid = v)),
                            ],
                          ),
                        ],
                      ),
                    ),

                    // Blocks section
                    if (isEditing) ...[
                      const SizedBox(height: 24),
                      Row(
                        children: [
                          Text(t('محتوى الدرس', 'Lesson Content'), style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          const Spacer(),
                          Text('${_blocks.length} ${t("عناصر", "blocks")}', style: const TextStyle(color: AppColors.inkMuted, fontSize: 12)),
                        ],
                      ),
                      const SizedBox(height: 12),
                      if (_blocks.isEmpty)
                        Container(
                          padding: const EdgeInsets.all(32),
                          decoration: BoxDecoration(
                            color: AppColors.primary.withValues(alpha: 0.04),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: AppColors.border, style: BorderStyle.solid),
                          ),
                          child: Column(
                            children: [
                              const Icon(Icons.add_circle_outline, size: 40, color: AppColors.inkMuted),
                              const SizedBox(height: 8),
                              Text(t('اضغط + لإضافة محتوى', 'Tap + to add content'), style: const TextStyle(color: AppColors.inkMuted)),
                            ],
                          ),
                        )
                      else
                        ...List.generate(_blocks.length, (i) {
                          final block = _blocks[i];
                          return Container(
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              borderRadius: BorderRadius.circular(10),
                              border: Border.all(color: AppColors.border),
                            ),
                            child: ListTile(
                              leading: _blockIcon(block.type),
                              title: Text(
                                block.titleAr ?? block.contentAr?.substring(0, (block.contentAr!.length > 40 ? 40 : block.contentAr!.length)) ?? block.type,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(fontSize: 13),
                              ),
                              subtitle: Text(block.type, style: const TextStyle(fontSize: 11, color: AppColors.inkMuted)),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    icon: const Icon(Icons.edit, size: 18),
                                    onPressed: () => _showBlockEditor(block.type, block),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete, size: 18, color: AppColors.error),
                                    onPressed: () => _deleteBlock(block.id),
                                  ),
                                ],
                              ),
                            ),
                          );
                        }),
                    ],
                    const SizedBox(height: 80), // Space for FAB
                  ],
                ),
              ),
      ),
    );
  }

  Widget _blockIcon(String type) {
    final icons = {
      'rich_text': Icons.text_fields,
      'video': Icons.videocam,
      'image': Icons.image,
      'tip': Icons.lightbulb,
      'warning': Icons.warning,
      'example': Icons.auto_awesome,
      'exercise': Icons.edit_note,
      'equation': Icons.functions,
      'qa': Icons.quiz,
      'link': Icons.link,
      'file': Icons.attach_file,
    };
    return Icon(icons[type] ?? Icons.extension, size: 20, color: AppColors.primary);
  }
}
