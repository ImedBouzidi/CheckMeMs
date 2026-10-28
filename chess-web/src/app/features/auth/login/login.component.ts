import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="auth-page">
      <aside class="auth-showcase">
        <a routerLink="/" class="showcase-brand">
          <span class="showcase-brand-mark">
            <img src="assets/logo/knight-dark.svg" alt="">
          </span>
          <span>CheckMe</span>
        </a>

        <div class="showcase-content">
          <div class="board-stage" aria-hidden="true">
            <div class="board-glow"></div>
            <div class="chess-frame">
              <div class="rank-row top">
                <div class="corner"></div>
                <div class="file-labels-top wooden-strip">
                  <div *ngFor="let file of files" class="file-label">{{ file }}</div>
                </div>
                <div class="corner"></div>
              </div>
              <div class="middle-row">
                <div class="rank-labels-left wooden-strip">
                  <div *ngFor="let rank of ranks" class="rank-label">{{ rank }}</div>
                </div>
                <div class="chess-board">
                  <div *ngFor="let square of boardSquares"
                       class="square"
                       [class.light]="square.isLight"
                       [class.dark]="square.isDark">
                    <img *ngIf="square.piece"
                         [src]="'assets/chess-pieces/' + square.piece + '.svg'"
                         class="board-piece"
                         alt="">
                  </div>
                </div>
                <div class="rank-labels-right wooden-strip">
                  <div *ngFor="let rank of ranks" class="rank-label">{{ rank }}</div>
                </div>
              </div>
              <div class="rank-row bottom">
                <div class="corner"></div>
                <div class="file-labels wooden-strip">
                  <div *ngFor="let file of files" class="file-label">{{ file }}</div>
                </div>
                <div class="corner"></div>
              </div>
            </div>
            <div class="board-caption">
              <span class="caption-dot"></span>
              <span>Game in progress</span>
              <span class="caption-moves">Move {{ moveNumber }}/{{ totalMoves }}</span>
            </div>
          </div>

          <div class="showcase-quote">
            <p>“Every position has a story. Learn to read it.”</p>
            <span>Play · Learn · Review</span>
          </div>
        </div>
      </aside>

      <main class="auth-panel">
        <div class="auth-panel-inner">
          <a class="auth-back" routerLink="/">
            <mat-icon>arrow_back</mat-icon>
            Back to CheckMe
          </a>

          <div class="auth-card">
            <a class="mobile-brand" routerLink="/" aria-label="CheckMe home">
              <span class="mobile-brand-mark">
                <img src="assets/logo/knight-dark.svg" alt="">
              </span>
              <span><strong>Check</strong><strong class="brand-outline">Me</strong></span>
            </a>

            <div class="brand-section">
              <div class="brand-logo">
                <img src="assets/logo/knight-dark.svg" alt="" class="knight-logo">
              </div>
              <h1 class="brand-title">
                <span class="check">Check</span><span class="me">Me</span>
              </h1>
              <p class="brand-subtitle">Sign in to continue your chess journey.</p>
            </div>

            <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input
                  matInput
                  type="email"
                  formControlName="email"
                  placeholder="you@example.com"
                  autocomplete="email">
                <mat-icon matPrefix>email</mat-icon>
                <mat-error *ngIf="loginForm.get('email')?.hasError('required')">Email is required</mat-error>
                <mat-error *ngIf="loginForm.get('email')?.hasError('email')">Please enter a valid email</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  [type]="hidePassword() ? 'password' : 'text'"
                  formControlName="password"
                  placeholder="Enter your password"
                  autocomplete="current-password">
                <mat-icon matPrefix>lock</mat-icon>
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'"
                  (click)="hidePassword.set(!hidePassword())">
                  <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="loginForm.get('password')?.hasError('required')">Password is required</mat-error>
              </mat-form-field>

              <button mat-flat-button color="primary" class="full-width login-btn" type="submit" [disabled]="loginForm.invalid || loading()">
                <mat-spinner diameter="20" *ngIf="loading()"></mat-spinner>
                <span *ngIf="!loading()">
                  Sign in
                  <mat-icon>arrow_forward</mat-icon>
                </span>
              </button>
            </form>

            <div class="divider">
              <div class="divider-line"></div>
              <span class="divider-text">or continue with</span>
              <div class="divider-line"></div>
            </div>

            <button mat-stroked-button class="full-width google-btn" type="button" (click)="loginWithGoogle()" [disabled]="loading()">
              <svg class="google-icon" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div class="register-link">
              <p>New to CheckMe? <a routerLink="/auth/register">Create an account</a></p>
            </div>
          </div>

          <p class="auth-footer">A calmer place to play better chess.</p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }

    .auth-page {
      display: flex;
      min-height: 100dvh;
      background: #f5f7fb;
    }

    .auth-showcase {
      position: relative;
      display: flex;
      flex: 0 0 53%;
      flex-direction: column;
      overflow: hidden;
      padding: 34px clamp(28px, 5vw, 64px) 42px;
      background:
        radial-gradient(620px 440px at 80% 12%, rgba(37, 99, 235, 0.19), transparent 65%),
        radial-gradient(480px 380px at 12% 100%, rgba(14, 116, 144, 0.12), transparent 70%),
        linear-gradient(145deg, #0b1220, #111c30 55%, #0f172a);
      color: #f8fafc;
    }

    .auth-showcase::before {
      position: absolute;
      right: -180px;
      bottom: -220px;
      width: 520px;
      height: 520px;
      border: 1px solid rgba(96, 165, 250, 0.12);
      border-radius: 50%;
      content: '';
      pointer-events: none;
    }

    .auth-showcase::after {
      position: absolute;
      top: 20%;
      right: -90px;
      width: 300px;
      height: 300px;
      border: 1px dashed rgba(148, 163, 184, 0.12);
      border-radius: 50%;
      content: '';
      pointer-events: none;
    }

    .showcase-brand {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-self: flex-start;
      align-items: center;
      gap: 10px;
      color: #f8fafc;
      font-size: 0.94rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      text-decoration: none;
    }

    .showcase-brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 11px;
      background: #ffffff;
    }

    .showcase-brand-mark img {
      width: 25px;
      height: 25px;
    }

    .showcase-content {
      position: relative;
      z-index: 1;
      display: flex;
      flex: 1;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 28px;
      padding: 30px 0 0;
    }

    .board-stage {
      position: relative;
      display: flex;
      width: 100%;
      max-width: 560px;
      flex-direction: column;
      align-items: center;
    }

    .board-glow {
      position: absolute;
      top: 8%;
      left: 18%;
      width: 64%;
      height: 64%;
      border-radius: 50%;
      background: rgba(37, 99, 235, 0.22);
      filter: blur(70px);
      pointer-events: none;
    }

    .chess-frame {
      position: relative;
      display: flex;
      width: min(100%, 500px);
      flex-direction: column;
      border: 6px solid #3e2723;
      background: linear-gradient(145deg, #8b4513 0%, #654321 25%, #4a2c2a 50%, #654321 75%, #8b4513 100%);
      box-shadow:
        0 38px 90px rgba(0, 0, 0, 0.65),
        inset 0 3px 6px rgba(160, 82, 45, 0.4),
        inset 0 -3px 6px rgba(0, 0, 0, 0.5);
    }

    .rank-row,
    .middle-row {
      display: flex;
    }

    .corner {
      width: 28px;
      height: 28px;
      flex: 0 0 28px;
      border: 1px solid #3e2723;
      background: linear-gradient(145deg, #8b4513 0%, #4a2c2a 100%);
    }

    .wooden-strip {
      border: 1px solid #3e2723;
      background: linear-gradient(90deg, #8b4513 0%, #654321 50%, #8b4513 100%);
    }

    .rank-labels-left,
    .rank-labels-right {
      display: flex;
      width: 28px;
      flex: 0 0 28px;
      flex-direction: column;
      justify-content: space-around;
      padding: 0 5px;
    }

    .rank-label {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      color: #f5deb3;
      font-size: 0.65rem;
      font-weight: 700;
      text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.9);
    }

    .chess-board {
      display: grid;
      width: 100%;
      aspect-ratio: 1;
      flex: 1;
      grid-template-columns: repeat(8, 1fr);
      grid-template-rows: repeat(8, 1fr);
      border: 2px solid #2e1a1a;
    }

    .square {
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .square.light { background: #f0d9b5; }
    .square.dark { background: #b58863; }

    .board-piece {
      z-index: 1;
      width: 88%;
      height: 88%;
    }

    .file-labels,
    .file-labels-top {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: space-around;
      padding: 4px 0;
    }

    .file-label {
      flex: 1;
      color: #f5deb3;
      font-size: 0.65rem;
      font-weight: 700;
      text-align: center;
      text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.9);
    }

    .board-caption {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 16px;
      color: #94a3b8;
      font-size: 0.7rem;
      font-weight: 600;
    }

    .caption-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #34d399;
      box-shadow: 0 0 0 4px rgba(52, 211, 153, 0.1);
    }

    .caption-moves {
      color: #64748b;
      font-variant-numeric: tabular-nums;
    }

    .showcase-quote {
      max-width: 500px;
      text-align: center;
    }

    .showcase-quote p {
      margin: 0;
      color: #e2e8f0;
      font-size: clamp(1rem, 1.6vw, 1.22rem);
      font-weight: 500;
      letter-spacing: -0.02em;
    }

    .showcase-quote span {
      display: block;
      margin-top: 8px;
      color: #64748b;
      font-size: 0.63rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .auth-panel {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      padding: 34px 24px;
      background:
        radial-gradient(620px 400px at 100% 0%, rgba(219, 234, 254, 0.65), transparent 65%),
        linear-gradient(180deg, #fbfcff, #f5f7fb);
    }

    .auth-panel-inner {
      display: flex;
      width: 100%;
      max-width: 430px;
      flex-direction: column;
      align-items: stretch;
      gap: 16px;
    }

    .auth-back {
      display: inline-flex;
      align-self: flex-start;
      align-items: center;
      gap: 5px;
      color: #64748b;
      font-size: 0.75rem;
      font-weight: 600;
      text-decoration: none;
    }

    .auth-back:hover {
      color: var(--cm-primary-dark);
    }

    .auth-back mat-icon {
      width: 16px;
      height: 16px;
      font-size: 16px;
    }

    .auth-card {
      width: 100%;
      padding: 34px 34px 30px;
      border: 1px solid rgba(203, 213, 225, 0.82);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 30px 65px -34px rgba(15, 23, 42, 0.3);
    }

    .mobile-brand {
      display: none;
      align-items: center;
      gap: 8px;
      margin-bottom: 24px;
      color: #0f172a;
      font-size: 0.9rem;
      text-decoration: none;
    }

    .mobile-brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      border-radius: 10px;
      background: #f1f5f9;
    }

    .mobile-brand-mark img {
      width: 24px;
      height: 24px;
    }

    .brand-outline {
      color: var(--cm-primary);
    }

    .brand-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 7px;
      margin-bottom: 27px;
      text-align: center;
    }

    .knight-logo {
      width: 52px;
      height: 52px;
      filter: brightness(0);
    }

    .brand-title {
      display: flex;
      align-items: stretch;
      overflow: hidden;
      margin: 2px 0 0;
      border: 3px solid #0f172a;
      border-radius: 10px;
      font-size: 2.35rem;
      font-weight: 800;
      letter-spacing: -0.045em;
      line-height: 1;
    }

    .check {
      padding: 5px 12px 6px 16px;
      background: #0f172a;
      color: #ffffff;
    }

    .me {
      padding: 5px 16px 6px 10px;
      background: #ffffff;
      color: #0f172a;
    }

    .brand-subtitle {
      margin: 3px 0 0;
      color: #64748b;
      font-size: 0.85rem;
      line-height: 1.5;
    }

    .login-form {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .full-width {
      width: 100%;
    }

    .auth-card .mat-mdc-form-field {
      width: 100%;
      margin-bottom: 2px;
    }

    .auth-card .mat-mdc-form-field-icon-prefix > .mat-icon {
      color: #94a3b8;
    }

    .login-btn {
      width: 100%;
      min-height: 49px;
      margin-top: 7px;
      border-radius: 12px;
      font-size: 0.92rem;
      font-weight: 700;
      letter-spacing: 0;
      box-shadow: 0 10px 22px -14px rgba(37, 99, 235, 0.8);
    }

    .login-btn .mat-icon {
      width: 18px;
      height: 18px;
      margin-left: 4px;
      font-size: 18px;
    }

    .login-btn mat-spinner {
      display: inline-block;
      margin-right: 8px;
      --mdc-circular-progress-active-indicator-color: #ffffff;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 22px 0 17px;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: #e8edf4;
    }

    .divider-text {
      color: #94a3b8;
      font-size: 0.66rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .google-btn {
      width: 100%;
      min-height: 45px;
      border-color: #dbe3ee;
      border-radius: 12px;
      color: #334155;
      font-size: 0.82rem;
      font-weight: 600;
    }

    .google-btn:hover {
      background: #f8fafc;
    }

    .google-icon {
      flex-shrink: 0;
    }

    .register-link {
      margin-top: 22px;
      color: #64748b;
      font-size: 0.78rem;
      text-align: center;
    }

    .register-link p {
      margin: 0;
    }

    .register-link a {
      color: var(--cm-primary-dark);
      font-weight: 700;
      text-decoration: none;
    }

    .register-link a:hover {
      text-decoration: underline;
    }

    .auth-footer {
      margin: 0;
      color: #94a3b8;
      font-size: 0.68rem;
      font-weight: 600;
      text-align: center;
    }

    @media (max-width: 1050px) {
      .auth-showcase {
        flex-basis: 48%;
        padding-inline: 28px;
      }

      .chess-frame {
        width: min(100%, 430px);
      }
    }

    @media (max-width: 900px) {
      .auth-showcase {
        display: none;
      }

      .auth-panel {
        min-height: 100dvh;
        padding: 26px 16px;
      }

      .mobile-brand {
        display: inline-flex;
      }

      .auth-back {
        display: none;
      }
    }

    @media (max-width: 480px) {
      .auth-panel {
        align-items: flex-start;
        padding: 16px 12px 24px;
      }

      .auth-card {
        padding: 26px 20px 24px;
        border-radius: 20px;
      }

      .brand-section {
        margin-bottom: 22px;
      }

      .knight-logo {
        width: 44px;
        height: 44px;
      }

      .brand-title {
        font-size: 2rem;
      }

      .auth-footer {
        display: none;
      }
    }
  `]
})
export class LoginComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  loading = signal(false);
  boardSquares: any[] = [];
  moveNumber = 0;
  totalMoves = 34;
  private chess = new Chess();
  private moveTimer: any;
  files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  ranks = ['8', '7', '6', '5', '4', '3', '2', '1'];
  private moveSound = new Audio('assets/sounds/move.mp3');

  constructor() {
    this.moveSound.load();
    this.initBoard();
  }

  ngOnInit(): void {
    this.playGame();
  }

  ngOnDestroy(): void {
    if (this.moveTimer) clearTimeout(this.moveTimer);
  }

  private playMoveSound(): void {
    try {
      this.moveSound.currentTime = 0;
      this.moveSound.play().catch(() => {});
    } catch (e) {}
  }

  private playGame(): void {
    const pgn = `1. e4 e5 2. d4 exd4 3. Nf3 g6 4. Bc4 Bg7 5. Ng5 Nh6 6. c3 O-O 7. cxd4 d6 8. O-O c6 9. Nc3 b5 10. Bd3 Bg4 11. f3 Be6 12. e5 dxe5 13. dxe5 Qb6+ 14. Kh1 Nd7 15. Nce4 Nxe5 16. Nxe6 fxe6 17. Ng5 Rad8 18. Nxe6 Rxd3 19. Qe2 Rf5 20. Bf4 Qd4 21. Nxd4 Rxf4 22. Nb3 Rd8 23. Nc5 Rfd4 24. f4 Neg4 25. Ne6 Rd2 26. Qe4 Re8 27. Qxc6 Nf2+ 28. Kg1 Rf8 29. Nxf8 Bxf8 30. Qe6+ Kg7 31. Qe3 Nhg4 32. Qxd2 Bc5 33. Qc3+ Kh6 34. Qxc5 1-0`;
    this.chess.loadPgn(pgn);
    const moves = this.chess.history();
    this.chess.reset();
    this.animateMoves(moves, 0);
  }

  private animateMoves(moves: string[], index: number): void {
    if (index < moves.length) {
      this.moveTimer = setTimeout(() => {
        this.chess.move(moves[index]);
        this.moveNumber = Math.floor((index + 1) / 2) + 1;
        this.updateBoard();
        this.playMoveSound();
        this.animateMoves(moves, index + 1);
      }, 1100);
    } else {
      this.moveTimer = setTimeout(() => {
        this.chess.reset();
        this.moveNumber = 0;
        this.updateBoard();
        this.playGame();
      }, 4000);
    }
  }

  private initBoard(): void {
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const rank = 8 - row;
        const file = files[col];
        const isLight = (row + col) % 2 === 0;
        this.boardSquares.push({ file, rank, isLight, isDark: !isLight, piece: '' });
      }
    }
    this.updateBoard();
  }

  private updateBoard(): void {
    this.boardSquares.forEach(square => {
      const squareName = square.file + square.rank;
      const piece = this.chess.get(squareName as any);
      square.piece = piece ? piece.color + piece.type.toUpperCase() : '';
    });
  }

  loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });

  async onSubmit(): Promise<void> {
    if (this.loginForm.valid) {
      this.loading.set(true);
      const success = await this.authService.login(this.loginForm.value);
      this.loading.set(false);

      if (success) {
        this.snackBar.open('Login successful!', 'Close', { duration: 3000 });
        const returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
        this.router.navigateByUrl(returnUrl);
      } else {
        this.snackBar.open('Invalid email or password', 'Close', { duration: 3000 });
      }
    }
  }

  loginWithGoogle(): void {
    this.loading.set(true);
    setTimeout(() => {
      this.authService.loginWithGoogle();
      this.loading.set(false);
    }, 500);
  }
}
