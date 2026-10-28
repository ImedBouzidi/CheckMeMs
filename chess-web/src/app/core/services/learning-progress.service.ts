import { computed, Injectable, signal } from '@angular/core';

interface ProgressState {
  completed: string[];
  lastOpened: string | null;
}

const STORAGE_KEY = 'checkme.learning.progress.v1';

function lessonKey(courseId: string, lessonId: string): string {
  return `${courseId}/${lessonId}`;
}

function readState(): ProgressState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { completed: [], lastOpened: null };
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      completed: Array.isArray(parsed.completed) ? parsed.completed.filter((v): v is string => typeof v === 'string') : [],
      lastOpened: typeof parsed.lastOpened === 'string' ? parsed.lastOpened : null
    };
  } catch {
    return { completed: [], lastOpened: null };
  }
}

/**
 * Lesson progress for Slice 1. The shape mirrors a future backend table
 * (`lesson_progress(user_id, lesson_id, completed_at)`); swap the storage
 * layer for an API call when accounts are wired up.
 */
@Injectable({ providedIn: 'root' })
export class LearningProgressService {
  private readonly state = signal<ProgressState>(readState());

  readonly completed = computed(() => new Set(this.state().completed));
  readonly lastOpened = computed(() => this.state().lastOpened);

  isComplete(courseId: string, lessonId: string): boolean {
    return this.completed().has(lessonKey(courseId, lessonId));
  }

  markOpened(courseId: string, lessonId: string): void {
    this.write({ ...this.state(), lastOpened: lessonKey(courseId, lessonId) });
  }

  completeLesson(courseId: string, lessonId: string): void {
    const key = lessonKey(courseId, lessonId);
    const completed = this.state().completed;
    if (completed.includes(key)) return;
    this.write({ ...this.state(), completed: [...completed, key], lastOpened: key });
  }

  completedCount(courseId: string, lessonIds: string[]): number {
    const done = this.completed();
    return lessonIds.filter(id => done.has(lessonKey(courseId, id))).length;
  }

  reset(): void {
    this.write({ completed: [], lastOpened: null });
  }

  private write(next: ProgressState): void {
    this.state.set(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage failures; the in-memory state still applies.
    }
  }
}
