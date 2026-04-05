String? extractYoutubeId(String url) {
  final regex = RegExp(r'(?:youtu\.be/|v/|embed/|watch\?v=|&v=)([^#&?]*)');
  final match = regex.firstMatch(url);
  return match?.group(1);
}
