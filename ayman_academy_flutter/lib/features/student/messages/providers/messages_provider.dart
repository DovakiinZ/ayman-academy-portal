import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:ayman_academy_app/core/supabase_client.dart';
import 'package:ayman_academy_app/shared/models/message.dart';
import 'package:ayman_academy_app/shared/models/profile.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

/// Contact with latest message info
class ChatContact {
  final Profile profile;
  final String? lastMessage;
  final String? lastMessageAt;
  final int unreadCount;

  const ChatContact({
    required this.profile,
    this.lastMessage,
    this.lastMessageAt,
    this.unreadCount = 0,
  });
}

final chatContactsProvider = FutureProvider<List<ChatContact>>((ref) async {
  final userId = supabase.auth.currentUser?.id;
  if (userId == null) return [];

  // Get all messages involving this user
  final data = await supabase
      .from('messages')
      .select('*, sender:profiles!sender_id(id, full_name, avatar_url, role), receiver:profiles!receiver_id(id, full_name, avatar_url, role)')
      .or('sender_id.eq.$userId,receiver_id.eq.$userId')
      .order('created_at', ascending: false);

  final messages = data as List;
  final contactMap = <String, ChatContact>{};

  for (final m in messages) {
    final senderId = m['sender_id'] as String;
    final receiverId = m['receiver_id'] as String;
    final contactId = senderId == userId ? receiverId : senderId;

    if (contactMap.containsKey(contactId)) {
      // Update unread count
      if (senderId != userId && m['read_at'] == null) {
        final existing = contactMap[contactId]!;
        contactMap[contactId] = ChatContact(
          profile: existing.profile,
          lastMessage: existing.lastMessage,
          lastMessageAt: existing.lastMessageAt,
          unreadCount: existing.unreadCount + 1,
        );
      }
      continue;
    }

    final contactData = senderId == userId ? m['receiver'] : m['sender'];
    if (contactData == null) continue;

    final isUnread = senderId != userId && m['read_at'] == null;

    contactMap[contactId] = ChatContact(
      profile: Profile.fromJson(contactData as Map<String, dynamic>),
      lastMessage: m['content'] as String?,
      lastMessageAt: m['created_at'] as String?,
      unreadCount: isUnread ? 1 : 0,
    );
  }

  return contactMap.values.toList();
});

class ChatNotifier extends StateNotifier<List<Message>> {
  final String contactId;
  final String userId;
  RealtimeChannel? _channel;

  ChatNotifier({required this.contactId, required this.userId}) : super([]) {
    _loadMessages();
    _subscribe();
  }

  Future<void> _loadMessages() async {
    final data = await supabase
        .from('messages')
        .select('*, sender:profiles!sender_id(id, full_name, avatar_url)')
        .or('and(sender_id.eq.$userId,receiver_id.eq.$contactId),and(sender_id.eq.$contactId,receiver_id.eq.$userId)')
        .order('created_at', ascending: true);

    state = (data as List).map((m) => Message.fromJson(m as Map<String, dynamic>)).toList();

    // Mark as read
    _markAsRead();
  }

  void _subscribe() {
    _channel = supabase
        .channel('chat_${userId}_$contactId')
        .onPostgresChanges(
          event: PostgresChangeEvent.insert,
          schema: 'public',
          table: 'messages',
          callback: (payload) {
            final msg = Message.fromJson(payload.newRecord);
            if ((msg.senderId == contactId && msg.receiverId == userId) ||
                (msg.senderId == userId && msg.receiverId == contactId)) {
              state = [...state, msg];
              if (msg.senderId == contactId) _markAsRead();
            }
          },
        )
        .subscribe();
  }

  Future<void> sendMessage(String content) async {
    await supabase.from('messages').insert({
      'sender_id': userId,
      'receiver_id': contactId,
      'content': content,
    });
  }

  Future<void> _markAsRead() async {
    await supabase
        .from('messages')
        .update({'read_at': DateTime.now().toIso8601String()})
        .eq('sender_id', contactId)
        .eq('receiver_id', userId)
        .isFilter('read_at', null);
  }

  @override
  void dispose() {
    _channel?.unsubscribe();
    super.dispose();
  }
}

final chatProvider = StateNotifierProvider.family<ChatNotifier, List<Message>, String>((ref, contactId) {
  final userId = supabase.auth.currentUser?.id ?? '';
  return ChatNotifier(contactId: contactId, userId: userId);
});
