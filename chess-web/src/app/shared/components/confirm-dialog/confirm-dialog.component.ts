import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDialogData {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  icon?: string;
  tone?: 'primary' | 'danger';
}

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <div class="confirm-content">
      <span class="confirm-icon" [class.confirm-icon--danger]="data.tone === 'danger'">
        <mat-icon>{{ data.icon || 'help_outline' }}</mat-icon>
      </span>
      <div class="confirm-copy">
        <h2 mat-dialog-title>{{ data.title }}</h2>
        <p>{{ data.message }}</p>
      </div>
    </div>

    <mat-dialog-actions class="confirm-actions" align="end">
      <button mat-button type="button" (click)="dialogRef.close(false)">
        {{ data.cancelLabel || 'Cancel' }}
      </button>
      <button
        mat-flat-button
        type="button"
        [color]="data.tone === 'danger' ? 'warn' : 'primary'"
        (click)="dialogRef.close(true)">
        {{ data.confirmLabel || 'Confirm' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host {
      display: block;
      color: var(--cm-ink);
    }

    .confirm-content {
      display: flex;
      align-items: flex-start;
      gap: 14px;
      padding: 24px 24px 12px;
    }

    .confirm-icon {
      display: inline-flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border: 1px solid #bfdbfe;
      border-radius: 14px;
      background: #eff6ff;
      color: var(--cm-primary-dark);
    }

    .confirm-icon--danger {
      border-color: #fecaca;
      background: #fef2f2;
      color: var(--cm-danger);
    }

    .confirm-icon mat-icon {
      width: 23px;
      height: 23px;
      font-size: 23px;
    }

    .confirm-copy {
      min-width: 0;
    }

    h2[mat-dialog-title] {
      margin: 0;
      padding: 0;
      color: #0f172a;
      font-size: 1.13rem;
      font-weight: 750;
      letter-spacing: -0.025em;
    }

    .confirm-copy p {
      margin: 6px 0 0;
      color: var(--cm-muted);
      font-size: 0.86rem;
      line-height: 1.55;
    }

    .confirm-actions {
      gap: 8px;
      padding: 14px 24px 20px;
    }

    .confirm-actions button {
      border-radius: 10px;
      font-weight: 700;
    }
  `]
})
export class ConfirmDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ConfirmDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDialogData
  ) {}
}
