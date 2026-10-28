import { Injectable, signal } from '@angular/core';
import { Course, Lesson } from '../models/course.models';

export type PremiumFeature =
  | 'course.premium'
  | 'lesson.premium'
  | 'analysis.deep'
  | 'analysis.opponent'
  | 'analysis.saved';

const STORAGE_KEY = 'checkme.premium.enabled';

const PREMIUM_ONLY: ReadonlySet<PremiumFeature> = new Set<PremiumFeature>([
  'course.premium',
  'lesson.premium',
  'analysis.deep',
  'analysis.opponent',
  'analysis.saved'
]);

function readFlag(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

/**
 * Frontend-only entitlement switch.
 *
 * This is deliberately cosmetic, exactly like the move-analysis plan says:
 * replace it with a subscription check from the backend before charging money,
 * and never expose premium course payloads through an unauthenticated API.
 */
@Injectable({ providedIn: 'root' })
export class PremiumService {
  private readonly premium = signal(readFlag());

  readonly isPremium = this.premium.asReadonly();

  canUse(feature: PremiumFeature): boolean {
    return this.premium() || !PREMIUM_ONLY.has(feature);
  }

  setPremium(value: boolean): void {
    this.premium.set(value);
    try {
      window.localStorage.setItem(STORAGE_KEY, value ? 'true' : 'false');
    } catch {
      // Ignore storage failures; the in-memory flag still applies.
    }
  }

  /** A course opens when it is free, or when the learner is premium. */
  canOpenCourse(course: Course): boolean {
    return course.tier === 'free' || this.premium();
  }

  /**
   * Free-tier rule:
   * - free lessons always open;
   * - the first lesson of any course opens as a teaser;
   * - everything else needs premium.
   */
  canOpenLesson(course: Course, lesson: Lesson, lessonIndex: number): boolean {
    if (this.premium()) return true;
    if ((lesson.tier ?? course.tier) === 'free') return true;
    return lessonIndex === 0;
  }
}
