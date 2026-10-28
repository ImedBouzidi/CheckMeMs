import { Component, computed, inject, isDevMode } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { LanguageService } from '../../core/i18n/language.service';
import { Course } from '../../core/models/course.models';
import { CourseService, LessonRef } from '../../core/services/course.service';
import { LearningProgressService } from '../../core/services/learning-progress.service';
import { PremiumService } from '../../core/services/premium.service';
import {
  ConfirmDialogComponent,
  ConfirmDialogData
} from '../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-learn',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="cm-page learn-page">
      <header class="cm-page-header">
        <div class="cm-page-heading">
          <span class="cm-eyebrow"><mat-icon>school</mat-icon> {{ language.t('learn.eyebrow') }}</span>
          <h1 class="cm-page-title">{{ language.t('learn.title') }}</h1>
          <p class="cm-page-subtitle">{{ language.t('learn.subtitle') }}</p>
        </div>
        <div class="cm-page-actions">
          <span class="cm-tag" [class.cm-tag--gold]="premium.isPremium()">
            <mat-icon>{{ premium.isPremium() ? 'workspace_premium' : 'lock_open' }}</mat-icon>
            {{ premium.isPremium() ? language.t('learn.hub.premiumActive') : language.t('learn.hub.freePlan') }}
          </span>
          @if (isDev) {
            <button mat-stroked-button type="button" (click)="togglePremium()">
              {{ premium.isPremium() ? language.t('learn.hub.freePlan') : language.t('learn.hub.devPremium') }}
            </button>
          }
        </div>
      </header>

      @if (featured(); as course) {
        <section class="featured-course">
          <div class="featured-copy">
            <span class="featured-label"><mat-icon>auto_awesome</mat-icon> {{ language.t('learn.hub.freeCourse') }}</span>
            <h2>{{ course.title }}</h2>
            <p>{{ course.summary }}</p>
            <div class="cm-button-row">
              <button mat-flat-button color="primary" type="button" (click)="openCourse(course)">
                <mat-icon>{{ completedCount(course) > 0 ? 'play_arrow' : 'rocket_launch' }}</mat-icon>
                {{ ctaLabel(course) }}
              </button>
              <span class="featured-meta">
                {{
                  language.t('learn.hub.progress', {
                    done: completedCount(course),
                    total: lessonCount(course)
                  })
                }}
              </span>
            </div>
            <div class="featured-progress" role="progressbar" [attr.aria-valuenow]="percent(course)" aria-valuemin="0" aria-valuemax="100">
              <span [style.width.%]="percent(course)"></span>
            </div>
          </div>

          <div class="featured-path" [attr.aria-label]="language.t('learn.hub.yourProgress')">
            @for (ref of featuredRefs(); track ref.lesson.id; let i = $index) {
              <button
                class="path-row"
                type="button"
                [class.path-row--done]="isDone(ref)"
                [class.path-row--current]="isCurrent(course, ref)"
                (click)="openLesson(ref)">
                <span class="path-index">{{ i + 1 < 10 ? '0' : '' }}{{ i + 1 }}</span>
                <span class="path-text">
                  <strong>{{ ref.lesson.title }}</strong>
                  <small>{{ ref.lesson.summary }}</small>
                </span>
                <mat-icon>{{ isDone(ref) ? 'check_circle' : isCurrent(course, ref) ? 'play_circle' : 'arrow_forward' }}</mat-icon>
              </button>
            }
          </div>
        </section>
      }

      <section class="cm-section" aria-labelledby="course-library-title">
        <div class="cm-section-heading">
          <h2 id="course-library-title" class="cm-section-title">{{ language.t('learn.hub.library') }}</h2>
          <span class="cm-tag">{{ courses().length }}</span>
        </div>

        <div class="course-grid">
          @for (course of courses(); track course.id) {
            <article
              class="course-card"
              [class.course-card--locked]="courseLocked(course)">
              <div class="course-card-top">
                <span
                  class="cm-icon-tile"
                  [class.cm-icon-tile--gold]="course.accent === 'gold'"
                  [class.cm-icon-tile--green]="course.accent === 'green'"
                  [class.cm-icon-tile--slate]="course.accent === 'slate'">
                  <mat-icon>{{ course.icon }}</mat-icon>
                </span>

                @if (courseLocked(course)) {
                  <span class="cm-tag cm-tag--gold"><mat-icon>lock</mat-icon>{{ language.t('learn.hub.locked') }}</span>
                } @else if (course.tier === 'free') {
                  <span class="cm-tag cm-tag--green">{{ language.t('learn.hub.freeCourse') }}</span>
                } @else {
                  <span class="cm-tag cm-tag--blue">{{ language.t('learn.hub.teaser') }}</span>
                }
              </div>

              <h3>{{ course.title }}</h3>
              <p>{{ course.summary }}</p>

              <div class="course-meta">
                <span>{{ language.t('learn.hub.lessons', { count: lessonCount(course) }) }}</span>
                <span>{{ language.t('learn.hub.minutes', { count: totalMinutes(course) }) }}</span>
                <span>{{ levelLabel(course) }}</span>
              </div>

              <div class="course-progress">
                <div class="course-progress-track" role="progressbar" [attr.aria-valuenow]="percent(course)" aria-valuemin="0" aria-valuemax="100">
                  <span [style.width.%]="percent(course)"></span>
                </div>
                <small>
                  {{
                    language.t('learn.hub.progress', {
                      done: completedCount(course),
                      total: lessonCount(course)
                    })
                  }}
                </small>
              </div>

              <button
                mat-flat-button
                type="button"
                class="course-cta"
                [color]="courseLocked(course) ? undefined : 'primary'"
                [class.course-cta--locked]="courseLocked(course)"
                (click)="openCourse(course)">
                <mat-icon>{{ courseLocked(course) ? 'lock' : 'play_arrow' }}</mat-icon>
                {{ ctaLabel(course) }}
              </button>
            </article>
          }
        </div>
      </section>
    </div>
  `,
  styles: [`
    .learn-page {
      max-width: 1120px;
    }

    .featured-course {
      display: grid;
      grid-template-columns: minmax(0, 1.05fr) minmax(300px, 0.95fr);
      gap: clamp(24px, 4vw, 48px);
      align-items: center;
      padding: clamp(26px, 4.5vw, 46px);
      border: 1px solid #c7d2fe;
      border-radius: 28px;
      background:
        radial-gradient(460px 300px at 100% 0%, rgba(199, 210, 254, 0.5), transparent 70%),
        radial-gradient(340px 260px at 0% 100%, rgba(167, 243, 208, 0.2), transparent 70%),
        linear-gradient(135deg, #ffffff, #f8faff 55%, #f5f3ff);
      box-shadow: var(--cm-shadow-lg);
    }

    .featured-label {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: #4338ca;
      font-size: 0.68rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      text-transform: uppercase;
    }

    .featured-label mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .featured-copy h2 {
      margin: 14px 0 10px;
      color: #111827;
      font-size: clamp(1.9rem, 4vw, 3rem);
      font-weight: 800;
      line-height: 1.04;
      letter-spacing: -0.05em;
    }

    .featured-copy > p {
      max-width: 54ch;
      margin: 0;
      color: #5c667a;
      font-size: 0.94rem;
      line-height: 1.7;
    }

    .featured-copy .cm-button-row {
      margin-top: 22px;
    }

    .featured-meta {
      color: #7c8798;
      font-size: 0.73rem;
      font-weight: 600;
    }

    .featured-progress {
      overflow: hidden;
      height: 5px;
      max-width: 320px;
      margin-top: 18px;
      border-radius: 999px;
      background: rgba(99, 102, 241, 0.14);
    }

    .featured-progress span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #6366f1, #22c55e);
      transition: width 0.3s ease;
    }

    .featured-path {
      overflow: hidden;
      border: 1px solid #dbe3ee;
      border-radius: 20px;
      background: rgba(255, 255, 255, 0.9);
      box-shadow: var(--cm-shadow);
    }

    .path-row {
      display: grid;
      grid-template-columns: 32px minmax(0, 1fr) 20px;
      gap: 11px;
      align-items: center;
      width: 100%;
      padding: 13px 16px;
      border: 0;
      background: transparent;
      color: var(--cm-ink-soft);
      font: inherit;
      text-align: start;
      cursor: pointer;
      transition: background 0.18s ease;
    }

    .path-row + .path-row {
      border-top: 1px solid #f1f5f9;
    }

    .path-row:hover {
      background: #f8faff;
    }

    .path-row--done {
      color: var(--cm-muted);
    }

    .path-row--current {
      background: #eef2ff;
      color: #3730a3;
    }

    .path-index {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: #f1f5f9;
      color: #64748b;
      font-family: monospace;
      font-size: 0.65rem;
      font-weight: 700;
    }

    .path-row--current .path-index {
      background: #ffffff;
      color: #4338ca;
      box-shadow: 0 2px 6px rgba(67, 56, 202, 0.12);
    }

    .path-text {
      display: flex;
      min-width: 0;
      flex-direction: column;
      gap: 2px;
    }

    .path-text strong {
      font-size: 0.78rem;
      font-weight: 700;
    }

    .path-text small {
      overflow: hidden;
      color: #94a3b8;
      font-size: 0.67rem;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .path-row mat-icon {
      width: 18px;
      height: 18px;
      color: #cbd5e1;
      font-size: 18px;
    }

    .path-row--done mat-icon {
      color: var(--cm-success);
    }

    .path-row--current mat-icon {
      color: #6366f1;
    }

    .course-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 270px), 1fr));
      gap: 18px;
    }

    .course-card {
      position: relative;
      display: flex;
      flex-direction: column;
      min-width: 0;
      padding: 22px;
      border: 1px solid rgba(203, 213, 225, 0.8);
      border-radius: 22px;
      background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95));
      box-shadow: var(--cm-shadow-sm);
      transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
    }

    .course-card:hover {
      transform: translateY(-3px);
      border-color: rgba(147, 197, 253, 0.95);
      box-shadow: var(--cm-shadow);
    }

    .course-card--locked {
      border-color: #fde68a;
      background: linear-gradient(180deg, #fffdf5, #fffaf0);
    }

    .course-card-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 12px;
    }

    .course-card h3 {
      margin: 16px 0 6px;
      color: var(--cm-ink);
      font-size: 1.12rem;
      font-weight: 750;
      letter-spacing: -0.02em;
    }

    .course-card > p {
      flex: 1;
      margin: 0;
      color: var(--cm-muted);
      font-size: 0.88rem;
      line-height: 1.6;
    }

    .course-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      margin-top: 16px;
      color: var(--cm-muted-light);
      font-size: 0.72rem;
      font-weight: 600;
    }

    .course-progress {
      margin-top: 14px;
    }

    .course-progress-track {
      overflow: hidden;
      height: 4px;
      border-radius: 999px;
      background: #eef2f7;
    }

    .course-progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #6366f1, #22c55e);
      transition: width 0.3s ease;
    }

    .course-progress small {
      display: block;
      margin-top: 6px;
      color: #94a3b8;
      font-size: 0.68rem;
    }

    .course-cta {
      margin-top: 18px;
      border-radius: 12px;
    }

    .course-cta--locked {
      border: 1px solid #fde68a;
      background: #fffbeb;
      color: #a16207;
    }

    @media (max-width: 850px) {
      .featured-course {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 520px) {
      .featured-course {
        padding: 24px 20px;
        border-radius: 24px;
      }

      .featured-copy .cm-button-row button {
        width: 100%;
      }
    }
  `]
})
export class LearnComponent {
  readonly language = inject(LanguageService);
  readonly premium = inject(PremiumService);
  readonly isDev = isDevMode();

  private readonly courseService = inject(CourseService);
  private readonly progress = inject(LearningProgressService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  readonly courses = this.courseService.courses;
  readonly featured = computed<Course | null>(() => this.courses()[0] ?? null);
  readonly featuredRefs = computed<LessonRef[]>(() => {
    const course = this.featured();
    return course ? this.courseService.lessonRefs(course) : [];
  });

  lessonCount(course: Course): number {
    return this.courseService.lessonCount(course);
  }

  totalMinutes(course: Course): number {
    return this.courseService.totalMinutes(course);
  }

  completedCount(course: Course): number {
    const ids = this.courseService.lessonRefs(course).map(ref => ref.lesson.id);
    return this.progress.completedCount(course.id, ids);
  }

  percent(course: Course): number {
    const total = this.lessonCount(course);
    if (total === 0) return 0;
    return Math.round((this.completedCount(course) / total) * 100);
  }

  levelLabel(course: Course): string {
    switch (course.level) {
      case 'beginner':
        return this.language.t('learn.hub.levelBeginner');
      case 'intermediate':
        return this.language.t('learn.hub.levelIntermediate');
      case 'advanced':
        return this.language.t('learn.hub.levelAdvanced');
    }
  }

  courseLocked(course: Course): boolean {
    return !this.premium.canOpenCourse(course);
  }

  lessonLocked(ref: LessonRef): boolean {
    return !this.premium.canOpenLesson(ref.course, ref.lesson, ref.index);
  }

  isDone(ref: LessonRef): boolean {
    return this.progress.isComplete(ref.course.id, ref.lesson.id);
  }

  isCurrent(course: Course, ref: LessonRef): boolean {
    return this.continueRef(course)?.lesson.id === ref.lesson.id;
  }

  ctaLabel(course: Course): string {
    if (this.courseLocked(course)) return this.language.t('learn.hub.locked');
    const total = this.lessonCount(course);
    const done = this.completedCount(course);
    if (total > 0 && done >= total) return this.language.t('learn.hub.review');
    if (done > 0) return this.language.t('learn.hub.continue');
    return this.language.t('learn.hub.start');
  }

  openCourse(course: Course): void {
    if (this.courseLocked(course)) {
      this.showUpgrade();
      return;
    }
    const ref = this.continueRef(course);
    if (ref) this.openLesson(ref);
  }

  openLesson(ref: LessonRef): void {
    if (this.lessonLocked(ref)) {
      this.showUpgrade();
      return;
    }
    void this.router.navigate(['/learn', ref.course.id, ref.lesson.id]);
  }

  togglePremium(): void {
    this.premium.setPremium(!this.premium.isPremium());
  }

  /** First unfinished unlocked lesson, falling back to the first unlocked one. */
  private continueRef(course: Course): LessonRef | null {
    const open = this.courseService.lessonRefs(course).filter(ref => !this.lessonLocked(ref));
    return open.find(ref => !this.isDone(ref)) ?? open[0] ?? null;
  }

  private showUpgrade(): void {
    const data: ConfirmDialogData = {
      title: this.language.t('learn.hub.lockedTitle'),
      message: this.language.t('learn.hub.lockedText'),
      confirmLabel: this.isDev ? this.language.t('learn.hub.devPremium') : this.language.t('learn.hub.unlock'),
      cancelLabel: this.language.t('learn.hub.close'),
      icon: 'workspace_premium'
    };

    this.dialog
      .open(ConfirmDialogComponent, { data })
      .afterClosed()
      .subscribe(confirmed => {
        if (confirmed && this.isDev) this.premium.setPremium(true);
      });
  }
}
