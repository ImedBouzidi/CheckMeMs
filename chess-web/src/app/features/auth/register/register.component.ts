import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';
import { Chess } from 'chess.js';

@Component({
  selector: 'app-register',
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
              <span>Your first game starts here</span>
              <span class="caption-moves">Move {{ moveNumber }}/{{ totalMoves }}</span>
            </div>
          </div>

          <div class="showcase-quote">
            <p>“A stronger game begins with a first look.”</p>
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
              <p class="brand-subtitle">Create your account and make every move count.</p>
            </div>

            <form [formGroup]="registerForm" (ngSubmit)="onSubmit()" class="register-form">
              <div class="name-row">
                <mat-form-field appearance="outline">
                  <mat-label>First name</mat-label>
                  <input matInput formControlName="firstName" placeholder="First name" autocomplete="given-name">
                  <mat-error *ngIf="registerForm.get('firstName')?.hasError('required')">Required</mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Last name</mat-label>
                  <input matInput formControlName="lastName" placeholder="Last name" autocomplete="family-name">
                  <mat-error *ngIf="registerForm.get('lastName')?.hasError('required')">Required</mat-error>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Username</mat-label>
                <input matInput formControlName="username" placeholder="Choose a username" autocomplete="username">
                <mat-icon matPrefix>person</mat-icon>
                <mat-error *ngIf="registerForm.get('username')?.hasError('required')">Username is required</mat-error>
                <mat-error *ngIf="registerForm.get('username')?.hasError('minlength')">At least 3 characters</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email</mat-label>
                <input matInput type="email" formControlName="email" placeholder="you@example.com" autocomplete="email">
                <mat-icon matPrefix>email</mat-icon>
                <mat-error *ngIf="registerForm.get('email')?.hasError('required')">Email is required</mat-error>
                <mat-error *ngIf="registerForm.get('email')?.hasError('email')">Invalid email</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Password</mat-label>
                <input
                  matInput
                  [type]="hidePassword() ? 'password' : 'text'"
                  formControlName="password"
                  placeholder="At least 8 characters"
                  autocomplete="new-password">
                <mat-icon matPrefix>lock</mat-icon>
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  [attr.aria-label]="hidePassword() ? 'Show password' : 'Hide password'"
                  (click)="hidePassword.set(!hidePassword())">
                  <mat-icon>{{ hidePassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="registerForm.get('password')?.hasError('required')">Password is required</mat-error>
                <mat-error *ngIf="registerForm.get('password')?.hasError('minlength')">At least 8 characters</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Confirm password</mat-label>
                <input
                  matInput
                  [type]="hideConfirmPassword() ? 'password' : 'text'"
                  formControlName="confirmPassword"
                  placeholder="Repeat your password"
                  autocomplete="new-password">
                <mat-icon matPrefix>lock</mat-icon>
                <button
                  mat-icon-button
                  matSuffix
                  type="button"
                  [attr.aria-label]="hideConfirmPassword() ? 'Show confirmed password' : 'Hide confirmed password'"
                  (click)="hideConfirmPassword.set(!hideConfirmPassword())">
                  <mat-icon>{{ hideConfirmPassword() ? 'visibility_off' : 'visibility' }}</mat-icon>
                </button>
                <mat-error *ngIf="registerForm.get('confirmPassword')?.hasError('required')">Required</mat-error>
                <mat-error *ngIf="registerForm.hasError('passwordMismatch') && registerForm.get('confirmPassword')?.touched">Passwords do not match</mat-error>
              </mat-form-field>

              <div class="password-hint">
                <mat-icon>shield</mat-icon>
                <span>Use at least 8 characters for your password.</span>
              </div>

              <button mat-flat-button color="primary" class="full-width register-btn" type="submit" [disabled]="registerForm.invalid || loading()">
                <mat-spinner diameter="20" *ngIf="loading()"></mat-spinner>
                <span *ngIf="!loading()">
                  Create account
                  <mat-icon>arrow_forward</mat-icon>
                </span>
              </button>
            </form>

            <div class="divider">
              <div class="divider-line"></div>
              <span class="divider-text">or continue with</span>
              <div class="divider-line"></div>
            </div>

            <button mat-stroked-button class="full-width google-btn" type="button" (click)="registerWithGoogle()" [disabled]="loading()">
              <svg class="google-icon" viewBox="0 0 24 24" width="19" height="19" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <div class="login-link">
              <p>Already have an account? <a routerLink="/auth/login">Sign in</a></p>
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
      flex: 0 0 51%;
      flex-direction: column;
      overflow: hidden;
      padding: 34px clamp(28px, 5vw, 64px) 38px;
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
      gap: 22px;
      padding: 24px 0 0;
    }

    .board-stage {
      position: relative;
      display: flex;
      width: 100%;
      max-width: 520px;
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
      width: min(100%, 440px);
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
      width: 26px;
      height: 26px;
      flex: 0 0 26px;
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
      width: 26px;
      flex: 0 0 26px;
      flex-direction: column;
      justify-content: space-around;
      padding: 0 4px;
    }

    .rank-label {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      color: #f5deb3;
      font-size: 0.6rem;
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
      font-size: 0.6rem;
      font-weight: 700;
      text-align: center;
      text-shadow: 2px 2px 3px rgba(0, 0, 0, 0.9);
    }

    .board-caption {
      display: flex;
      align-items: center;
      gap: 7px;
      margin-top: 14px;
      color: #94a3b8;
      font-size: 0.69rem;
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
      font-size: clamp(0.98rem, 1.5vw, 1.15rem);
      font-weight: 500;
      letter-spacing: -0.02em;
    }

    .showcase-quote span {
      display: block;
      margin-top: 7px;
      color: #64748b;
      font-size: 0.62rem;
      font-weight: 700;
      letter-spacing: 0.14em;
      text-transform: uppercase;
    }

    .auth-panel {
      display: flex;
      flex: 1;
      align-items: center;
      justify-content: center;
      padding: 28px 24px;
      background:
        radial-gradient(620px 400px at 100% 0%, rgba(219, 234, 254, 0.65), transparent 65%),
        linear-gradient(180deg, #fbfcff, #f5f7fb);
    }

    .auth-panel-inner {
      display: flex;
      width: 100%;
      max-width: 450px;
      flex-direction: column;
      align-items: stretch;
      gap: 14px;
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
      padding: 28px 32px 26px;
      border: 1px solid rgba(203, 213, 225, 0.82);
      border-radius: 24px;
      background: rgba(255, 255, 255, 0.96);
      box-shadow: 0 30px 65px -34px rgba(15, 23, 42, 0.3);
    }

    .mobile-brand {
      display: none;
      align-items: center;
      gap: 8px;
      margin-bottom: 20px;
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
      gap: 5px;
      margin-bottom: 22px;
      text-align: center;
    }

    .knight-logo {
      width: 44px;
      height: 44px;
      filter: brightness(0);
    }

    .brand-title {
      display: flex;
      align-items: stretch;
      overflow: hidden;
      margin: 1px 0 0;
      border: 3px solid #0f172a;
      border-radius: 9px;
      font-size: 2.08rem;
      font-weight: 800;
      letter-spacing: -0.045em;
      line-height: 1;
    }

    .check {
      padding: 5px 11px 6px 14px;
      background: #0f172a;
      color: #ffffff;
    }

    .me {
      padding: 5px 14px 6px 9px;
      background: #ffffff;
      color: #0f172a;
    }

    .brand-subtitle {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 0.82rem;
      line-height: 1.5;
    }

    .register-form {
      display: flex;
      flex-direction: column;
    }

    .name-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 9px;
    }

    .full-width {
      width: 100%;
    }

    .auth-card .mat-mdc-form-field {
      width: 100%;
      margin-bottom: 1px;
    }

    .auth-card .mat-mdc-form-field-icon-prefix > .mat-icon {
      color: #94a3b8;
    }

    :host-context(html.dark-theme) .auth-panel {
      background:
        radial-gradient(620px 400px at 100% 0%, rgba(37, 99, 235, 0.16), transparent 65%),
        linear-gradient(180deg, #101a2b, #0b1220);
    }

    :host-context(html.dark-theme) .auth-card {
      border-color: rgba(71, 85, 105, 0.72);
      background: rgba(17, 28, 46, 0.98);
      box-shadow: 0 30px 65px -34px rgba(0, 0, 0, 0.75);
    }

    :host-context(html.dark-theme) .auth-card .mat-mdc-text-field-wrapper {
      background-color: #18263b;
    }

    :host-context(html.dark-theme) .auth-card .mdc-text-field--outlined .mdc-notched-outline__leading,
    :host-context(html.dark-theme) .auth-card .mdc-text-field--outlined .mdc-notched-outline__notch,
    :host-context(html.dark-theme) .auth-card .mdc-text-field--outlined .mdc-notched-outline__trailing {
      border-color: #41536e;
    }

    :host-context(html.dark-theme) .auth-card .mdc-text-field--outlined:hover .mdc-notched-outline__leading,
    :host-context(html.dark-theme) .auth-card .mdc-text-field--outlined:hover .mdc-notched-outline__notch,
    :host-context(html.dark-theme) .auth-card .mdc-text-field--outlined:hover .mdc-notched-outline__trailing {
      border-color: #7aaef5;
    }

    :host-context(html.dark-theme) .auth-card .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    :host-context(html.dark-theme) .auth-card .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    :host-context(html.dark-theme) .auth-card .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: #60a5fa;
      border-width: 2px;
    }

    :host-context(html.dark-theme) .auth-card input,
    :host-context(html.dark-theme) .auth-card .mat-mdc-form-field-infix,
    :host-context(html.dark-theme) .auth-card .mat-mdc-form-field label {
      color: #e8eefc;
    }

    :host-context(html.dark-theme) .auth-card input::placeholder {
      color: #8fa2bd;
    }

    :host-context(html.dark-theme) .auth-card .google-btn {
      border-color: #41536e;
      color: #dbeafe;
    }

    :host-context(html.dark-theme) .auth-card .google-btn:hover {
      background: #1d2d45;
    }

    .password-hint {
      display: flex;
      align-items: center;
      gap: 6px;
      margin: 1px 0 12px;
      color: #94a3b8;
      font-size: 0.66rem;
    }

    .password-hint mat-icon {
      width: 14px;
      height: 14px;
      font-size: 14px;
    }

    .register-btn {
      width: 100%;
      min-height: 47px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      font-size: 0.9rem;
      font-weight: 700;
      letter-spacing: 0;
      box-shadow: 0 14px 26px -14px rgba(37, 99, 235, 0.95), inset 0 1px 0 rgba(255, 255, 255, 0.2);
      transition: transform 0.18s ease, box-shadow 0.18s ease, filter 0.18s ease;
    }

    .register-btn:not(:disabled):hover {
      filter: brightness(1.08);
      box-shadow: 0 18px 30px -14px rgba(37, 99, 235, 1), inset 0 1px 0 rgba(255, 255, 255, 0.24);
      transform: translateY(-1px);
    }

    .register-btn .mat-icon {
      width: 18px;
      height: 18px;
      margin-left: 4px;
      font-size: 18px;
    }

    .register-btn mat-spinner {
      display: inline-block;
      margin-right: 8px;
      --mdc-circular-progress-active-indicator-color: #ffffff;
    }

    .divider {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 18px 0 14px;
    }

    .divider-line {
      flex: 1;
      height: 1px;
      background: #e8edf4;
    }

    .divider-text {
      color: #94a3b8;
      font-size: 0.65rem;
      font-weight: 600;
    }

    .google-btn {
      width: 100%;
      min-height: 44px;
      border-color: #dbe3ee;
      border-radius: 12px;
      color: #334155;
      font-size: 0.81rem;
      font-weight: 600;
    }

    .google-btn:hover {
      background: #f8fafc;
    }

    .google-icon {
      flex-shrink: 0;
    }

    .login-link {
      margin-top: 18px;
      color: #64748b;
      font-size: 0.77rem;
      text-align: center;
    }

    .login-link p {
      margin: 0;
    }

    .login-link a {
      color: var(--cm-primary-dark);
      font-weight: 700;
      text-decoration: none;
    }

    .login-link a:hover {
      text-decoration: underline;
    }

    .auth-footer {
      margin: 0;
      color: #94a3b8;
      font-size: 0.67rem;
      font-weight: 600;
      text-align: center;
    }

    @media (max-width: 1080px) {
      .auth-showcase {
        flex-basis: 47%;
        padding-inline: 28px;
      }

      .chess-frame {
        width: min(100%, 390px);
      }
    }

    @media (max-width: 900px) {
      .auth-showcase {
        display: none;
      }

      .auth-panel {
        min-height: 100dvh;
        padding: 22px 16px;
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
        padding: 14px 12px 20px;
      }

      .auth-card {
        padding: 22px 18px 22px;
        border-radius: 20px;
      }

      .brand-section {
        margin-bottom: 18px;
      }

      .knight-logo {
        width: 40px;
        height: 40px;
      }

      .brand-title {
        font-size: 1.9rem;
      }

      .name-row {
        grid-template-columns: 1fr;
        gap: 0;
      }

      .auth-footer {
        display: none;
      }
    }
  `]
})
export class RegisterComponent implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);

  hidePassword = signal(true);
  hideConfirmPassword = signal(true);
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
      if (piece) {
        square.piece = piece.color + piece.type.toUpperCase();
      } else {
        square.piece = '';
      }
    });
  }

  registerForm: FormGroup = this.fb.group({
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: this.passwordMatchValidator });

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async onSubmit(): Promise<void> {
    if (this.registerForm.valid) {
      this.loading.set(true);
      const { confirmPassword, ...registerData } = this.registerForm.value;
      const success = await this.authService.register(registerData);
      this.loading.set(false);

      if (success) {
        this.snackBar.open('Account created successfully!', 'Close', { duration: 3000 });
        this.router.navigate(['/']);
      } else {
        this.snackBar.open('Registration failed. Please try again.', 'Close', { duration: 3000 });
      }
    }
  }

  registerWithGoogle(): void {
    this.loading.set(true);
    setTimeout(() => {
      this.authService.loginWithGoogle();
      this.loading.set(false);
    }, 500);
  }
}
