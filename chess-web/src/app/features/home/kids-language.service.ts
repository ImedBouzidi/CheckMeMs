import { Injectable, inject } from '@angular/core';

import { LanguageService } from '../../core/i18n/language.service';
import {
  INSTRUCTOR_COPY,
  INSTRUCTOR_LANGUAGES,
  InstructorCopy,
  InstructorLanguage,
  InstructorLanguageCode,
  KIDS_PIECE_COPY,
  KIDS_UI_COPY,
  KidsUiCopy,
  KidPieceName,
  PieceCopy,
  isInstructorLanguageCode
} from './kids-learn.i18n';

@Injectable({ providedIn: 'root' })
export class KidsLanguageService {
  readonly languages = INSTRUCTOR_LANGUAGES;
  private readonly appLanguage = inject(LanguageService);

  /** Shared with the main app so the navbar and Kids Mode stay in sync. */
  get languageCode(): InstructorLanguageCode {
    return this.appLanguage.language();
  }

  get copy(): KidsUiCopy {
    return KIDS_UI_COPY[this.languageCode];
  }

  get instructor(): InstructorCopy {
    return INSTRUCTOR_COPY[this.languageCode];
  }

  get activeLanguage(): InstructorLanguage {
    return this.languages.find(language => language.code === this.languageCode) ?? this.languages[0];
  }

  setLanguage(code: string): boolean {
    if (!isInstructorLanguageCode(code)) return false;
    return this.appLanguage.setLanguage(code);
  }

  pieceDetails(piece: { name: string }): PieceCopy {
    const name = piece.name as KidPieceName;
    return (
      KIDS_PIECE_COPY[this.languageCode][name] ??
      KIDS_PIECE_COPY.en[name] ?? {
        label: piece.name,
        sentenceName: piece.name.toLowerCase(),
        tip: '',
        moveText: '',
        captureText: ''
      }
    );
  }

  pieceLabel(piece: { name: string }): string {
    return this.pieceDetails(piece).label;
  }

  pieceName(piece: { name: string }): string {
    return this.pieceDetails(piece).sentenceName;
  }
}
