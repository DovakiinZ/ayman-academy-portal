import 'profile.dart';

class Message {
  final String id;
  final String senderId;
  final String receiverId;
  final String content;
  final String? readAt;
  final String createdAt;
  final Profile? sender;

  const Message({
    required this.id,
    required this.senderId,
    required this.receiverId,
    required this.content,
    this.readAt,
    required this.createdAt,
    this.sender,
  });

  factory Message.fromJson(Map<String, dynamic> json) => Message(
    id: json['id'] as String? ?? '',
    senderId: json['sender_id'] as String? ?? '',
    receiverId: json['receiver_id'] as String? ?? '',
    content: json['content'] as String? ?? '',
    readAt: json['read_at'] as String?,
    createdAt: json['created_at'] as String? ?? '',
    sender: json['sender'] != null
        ? Profile.fromJson(json['sender'] as Map<String, dynamic>)
        : null,
  );
}
