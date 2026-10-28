/**
 * Learning / courses domain model.
 *
 * Slice 1 keeps course content local. When the backend lands, the same
 * shapes can be served from `/courses` without changing the UI.
 *
 * i18n note: English copy lives in `courses.seed.ts`. Translated course copy is
 * overlaid by `courses.i18n.ts`, keyed by stable course/module/lesson ids.
 */

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export type CourseTier = 'free' | 'premium';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';
export type BoardOrientation = 'white' | 'black';

export type ArrowTone = 'default' | 'success' | 'warning' | 'info' | 'danger' | 'secondary';

export interface BoardArrow {
  from: string;
  to: string;
  tone?: ArrowTone;
}

export interface StepBase {
  /** Short heading shown above the step body. */
  title?: string;
  /** Lesson copy. Translated copy is overlaid from `courses.i18n.ts`. */
  text?: string;
}

export interface TextStep extends StepBase {
  kind: 'text';
}

export interface PositionStep extends StepBase {
  kind: 'position';
  fen: string;
  orientation?: BoardOrientation;
  arrows?: BoardArrow[];
  /** Squares to frame, e.g. the centre or a weak point. */
  highlights?: string[];
}

export interface TaskStep extends StepBase {
  kind: 'task';
  fen: string;
  orientation?: BoardOrientation;
  /**
   * SAN moves. Even indices are the learner's moves; odd indices are
   * scripted replies played automatically.
   */
  solution: string[];
  hint?: string;
  success?: string;
}

export interface PgnStep extends StepBase {
  kind: 'pgn';
  pgn: string;
}

export type LessonStep = TextStep | PositionStep | TaskStep | PgnStep;

export interface Lesson {
  id: string;
  title: string;
  summary?: string;
  estimatedMinutes?: number;
  /** Overrides the course tier for this lesson. */
  tier?: CourseTier;
  steps: LessonStep[];
}

export interface CourseModule {
  id: string;
  title: string;
  summary?: string;
  lessons: Lesson[];
}

export interface Course {
  id: string;
  title: string;
  summary: string;
  level: CourseLevel;
  tier: CourseTier;
  /** Material icon name. */
  icon: string;
  accent: 'blue' | 'gold' | 'green' | 'slate';
  modules: CourseModule[];
}
