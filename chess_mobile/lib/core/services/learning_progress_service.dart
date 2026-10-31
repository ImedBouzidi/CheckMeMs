import 'package:flutter/foundation.dart';

import 'storage_scope_service.dart';

/// Lesson progress, mirroring
/// `chess-web/src/app/core/services/learning-progress.service.ts`:
/// stored per account on this device (`lesson_progress(user_id, lesson_id, …)`
/// once the backend lands).
class LearningProgressService extends ChangeNotifier {
  LearningProgressService(this._storage) {
    _state = _readState();
    _storage.addListener(_onScopeChanged);
  }

  static const String _storageKey = 'checkme.learning.progress.v1';

  final StorageScopeService _storage;
  late _ProgressState _state;

  Set<String> get completed => _state.completed.toSet();

  String? get lastOpened => _state.lastOpened;

  void _onScopeChanged() {
    _state = _readState();
    notifyListeners();
  }

  @override
  void dispose() {
    _storage.removeListener(_onScopeChanged);
    super.dispose();
  }

  static String lessonKey(String courseId, String lessonId) => '$courseId/$lessonId';

  bool isComplete(String courseId, String lessonId) =>
      _state.completed.contains(lessonKey(courseId, lessonId));

  void markOpened(String courseId, String lessonId) {
    _write(_ProgressState(
      completed: _state.completed,
      lastOpened: lessonKey(courseId, lessonId),
    ));
  }

  void completeLesson(String courseId, String lessonId) {
    final key = lessonKey(courseId, lessonId);
    if (_state.completed.contains(key)) return;
    _write(_ProgressState(completed: [..._state.completed, key], lastOpened: key));
  }

  int completedCount(String courseId, List<String> lessonIds) {
    final done = _state.completed;
    return lessonIds.where((id) => done.contains(lessonKey(courseId, id))).length;
  }

  void reset() => _write(const _ProgressState(completed: [], lastOpened: null));

  void _write(_ProgressState next) {
    _state = next;
    _storage.write(_storageKey, {'completed': next.completed, 'lastOpened': next.lastOpened});
    notifyListeners();
  }

  _ProgressState _readState() {
    final parsed = _storage.read<Map<String, dynamic>>(_storageKey);
    if (parsed == null) return const _ProgressState(completed: [], lastOpened: null);

    return _ProgressState(
      completed: ((parsed['completed'] as List?) ?? const []).whereType<String>().toList(),
      lastOpened: parsed['lastOpened'] is String ? parsed['lastOpened'] as String : null,
    );
  }
}

class _ProgressState {
  const _ProgressState({required this.completed, required this.lastOpened});

  final List<String> completed;
  final String? lastOpened;
}
