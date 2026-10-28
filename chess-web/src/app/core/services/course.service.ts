import { computed, inject, Injectable } from '@angular/core';
import { localizeCourses } from '../data/courses.i18n';
import { COURSES } from '../data/courses.seed';
import { LanguageService } from '../i18n/language.service';
import { Course, CourseModule, Lesson } from '../models/course.models';

export interface LessonRef {
  course: Course;
  module: CourseModule;
  lesson: Lesson;
  /** Position of the lesson across the whole course. */
  index: number;
  moduleIndex: number;
  lessonIndex: number;
}

@Injectable({ providedIn: 'root' })
export class CourseService {
  private readonly language = inject(LanguageService);

  readonly courses = computed<ReadonlyArray<Course>>(() =>
    localizeCourses(COURSES, this.language.code())
  );

  getCourse(courseId: string): Course | null {
    return this.courses().find(course => course.id === courseId) ?? null;
  }

  lessonRefs(course: Course): LessonRef[] {
    const refs: LessonRef[] = [];
    let index = 0;

    course.modules.forEach((module, moduleIndex) => {
      module.lessons.forEach((lesson, lessonIndex) => {
        refs.push({ course, module, lesson, index, moduleIndex, lessonIndex });
        index += 1;
      });
    });

    return refs;
  }

  getLessonRef(courseId: string, lessonId: string): LessonRef | null {
    const course = this.getCourse(courseId);
    if (!course) return null;
    return this.lessonRefs(course).find(ref => ref.lesson.id === lessonId) ?? null;
  }

  nextLesson(courseId: string, lessonId: string): LessonRef | null {
    const course = this.getCourse(courseId);
    if (!course) return null;
    const refs = this.lessonRefs(course);
    const current = refs.findIndex(ref => ref.lesson.id === lessonId);
    if (current < 0) return null;
    return refs[current + 1] ?? null;
  }

  lessonCount(course: Course): number {
    return this.lessonRefs(course).length;
  }

  totalMinutes(course: Course): number {
    return this.lessonRefs(course).reduce((total, ref) => total + (ref.lesson.estimatedMinutes ?? 5), 0);
  }
}
