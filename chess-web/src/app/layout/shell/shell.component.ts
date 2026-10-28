import { Component, DestroyRef, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { BreakpointObserver } from '@angular/cdk/layout';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../core/services/auth.service';
import { LanguageService } from '../../core/i18n/language.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule
  ],
  template: `
    <mat-toolbar class="app-toolbar">
      <button
        mat-icon-button
        class="menu-toggle"
        type="button"
        [attr.aria-label]="language.t('nav.toggle')"
        (click)="sidenav.toggle()">
        <mat-icon>menu</mat-icon>
      </button>

      <a class="app-brand" routerLink="/" [attr.aria-label]="language.t('nav.homeAria')" (click)="closeIfMobile(sidenav)">
        <span class="brand-mark">
          <img src="assets/logo/knight-dark.svg" alt="" aria-hidden="true">
        </span>
        <span class="brand-copy">
          <strong>CheckMe</strong>
          <small>{{ language.t('nav.studio') }}</small>
        </span>
      </a>

      <span class="spacer"></span>

      <div class="toolbar-tools">
        <label class="language-picker" [attr.title]="language.t('nav.language')">
          <mat-icon aria-hidden="true">language</mat-icon>
          <select
            [value]="language.language()"
            [attr.aria-label]="language.t('nav.language')"
            (change)="changeLanguage($any($event.target).value)">
            @for (option of language.languages; track option.code) {
              <option [value]="option.code" [selected]="option.code === language.language()">
                {{ option.name }}
              </option>
            }
          </select>
        </label>

        <button
          mat-icon-button
          class="theme-toggle"
          type="button"
          [attr.aria-label]="theme.theme() === 'dark' ? language.t('nav.themeToLight') : language.t('nav.themeToDark')"
          [attr.title]="theme.theme() === 'dark' ? language.t('nav.themeToLight') : language.t('nav.themeToDark')"
          (click)="theme.toggle()">
          <mat-icon>{{ theme.theme() === 'dark' ? 'light_mode' : 'dark_mode' }}</mat-icon>
        </button>
      </div>

      @if (authService.isAuthenticated()) {
        <button mat-button class="account-button" type="button" [matMenuTriggerFor]="userMenu">
          <span class="account-avatar">{{ getInitials() }}</span>
          <span class="account-copy">
            <strong>{{ authService.userDisplayName() || language.t('nav.chessPlayer') }}</strong>
            <small>{{ language.t('nav.signedIn') }}</small>
          </span>
          <mat-icon class="account-chevron">expand_more</mat-icon>
        </button>

        <mat-menu #userMenu="matMenu" panelClass="account-menu-panel" xPosition="before">
          <button mat-menu-item routerLink="/play">
            <mat-icon>sports_esports</mat-icon>
            <span>{{ language.t('nav.playGame') }}</span>
          </button>
          <button mat-menu-item routerLink="/analysis">
            <mat-icon>insights</mat-icon>
            <span>{{ language.t('nav.reviewGame') }}</span>
          </button>
          <mat-divider></mat-divider>
          <button mat-menu-item (click)="authService.logout()">
            <mat-icon>logout</mat-icon>
            <span>{{ language.t('nav.logout') }}</span>
          </button>
        </mat-menu>
      } @else {
        <a mat-button class="toolbar-login" routerLink="/auth/login">{{ language.t('nav.login') }}</a>
        <a mat-flat-button class="toolbar-signup" routerLink="/auth/register">
          {{ language.t('nav.signup') }}
          <mat-icon>arrow_forward</mat-icon>
        </a>
      }
    </mat-toolbar>

    <mat-sidenav-container class="app-sidenav-container">
      <mat-sidenav
        #sidenav
        class="app-sidenav"
        [mode]="isMobile ? 'over' : 'side'"
        [opened]="!isMobile"
        [fixedInViewport]="isMobile">
        <div class="nav-scroll">
          <div class="nav-section">
            <p class="nav-label">{{ language.t('nav.playSection') }}</p>
            <mat-nav-list class="nav-list" [attr.aria-label]="language.t('nav.playNavAria')">
              <a
                mat-list-item
                class="nav-link"
                routerLink="/"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: true }"
                (click)="closeIfMobile(sidenav)">
                <mat-icon matListItemIcon>space_dashboard</mat-icon>
                <span matListItemTitle>{{ language.t('nav.home') }}</span>
              </a>
              <a
                mat-list-item
                class="nav-link"
                routerLink="/play"
                routerLinkActive="active"
                (click)="closeIfMobile(sidenav)">
                <mat-icon matListItemIcon>sports_esports</mat-icon>
                <span matListItemTitle>{{ language.t('nav.play') }}</span>
              </a>
            </mat-nav-list>
          </div>

          <div class="nav-section">
            <p class="nav-label">{{ language.t('nav.trainSection') }}</p>
            <mat-nav-list class="nav-list" [attr.aria-label]="language.t('nav.trainNavAria')">
              <a
                mat-list-item
                class="nav-link"
                routerLink="/puzzles"
                routerLinkActive="active"
                (click)="closeIfMobile(sidenav)">
                <mat-icon matListItemIcon>extension</mat-icon>
                <span matListItemTitle>{{ language.t('nav.puzzles') }}</span>
              </a>
              <a
                mat-list-item
                class="nav-link"
                routerLink="/openings"
                routerLinkActive="active"
                (click)="closeIfMobile(sidenav)">
                <mat-icon matListItemIcon>auto_stories</mat-icon>
                <span matListItemTitle>{{ language.t('nav.openings') }}</span>
              </a>
              <a
                mat-list-item
                class="nav-link"
                routerLink="/learn"
                routerLinkActive="active"
                (click)="closeIfMobile(sidenav)">
                <mat-icon matListItemIcon>school</mat-icon>
                <span matListItemTitle>{{ language.t('nav.learn') }}</span>
              </a>
            </mat-nav-list>
          </div>

          <div class="nav-section">
            <p class="nav-label">{{ language.t('nav.reviewSection') }}</p>
            <mat-nav-list class="nav-list" [attr.aria-label]="language.t('nav.reviewNavAria')">
              <a
                mat-list-item
                class="nav-link"
                routerLink="/analysis"
                routerLinkActive="active"
                (click)="closeIfMobile(sidenav)">
                <mat-icon matListItemIcon>insights</mat-icon>
                <span matListItemTitle>{{ language.t('nav.review') }}</span>
              </a>
            </mat-nav-list>
          </div>

          <div class="sidebar-promo">
            <span class="sidebar-promo-icon">
              <mat-icon>bolt</mat-icon>
            </span>
            <strong>{{ language.t('nav.readyTitle') }}</strong>
            <p>{{ language.t('nav.readyText') }}</p>
            <a mat-flat-button color="primary" routerLink="/play" (click)="closeIfMobile(sidenav)">
              {{ language.t('nav.startPlaying') }}
            </a>
          </div>
        </div>

        <div class="sidenav-footer">
          <span>{{ language.t('nav.footer') }}</span>
          <mat-icon aria-hidden="true">auto_awesome</mat-icon>
        </div>
      </mat-sidenav>

      <mat-sidenav-content class="app-content">
        <main class="content-inner">
          <router-outlet></router-outlet>
        </main>
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: [`
    :host {
      --toolbar-height: 68px;
      display: block;
      height: 100dvh;
      overflow: hidden;
    }

    .app-toolbar {
      position: relative;
      z-index: 1000;
      height: var(--toolbar-height);
      min-height: var(--toolbar-height);
      padding: 0 20px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.18);
      background: rgba(15, 23, 42, 0.96);
      color: #f8fafc;
      box-shadow: 0 12px 30px -24px rgba(15, 23, 42, 0.8);
      backdrop-filter: blur(16px);
    }

    .menu-toggle {
      flex: 0 0 auto;
      margin-inline-end: 8px;
      color: #dbeafe;
    }

    .app-brand {
      display: inline-flex;
      align-items: center;
      gap: 11px;
      min-width: 0;
      color: inherit;
      text-decoration: none;
    }

    .brand-mark {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 38px;
      height: 38px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      background: #ffffff;
      box-shadow: inset 0 -2px 0 rgba(15, 23, 42, 0.08);
    }

    .brand-mark img {
      width: 27px;
      height: 27px;
    }

    .brand-copy {
      display: flex;
      flex-direction: column;
      line-height: 1.05;
    }

    .brand-copy strong {
      font-size: 1.04rem;
      font-weight: 750;
      letter-spacing: -0.025em;
    }

    .brand-copy small {
      margin-top: 4px;
      color: #94a3b8;
      font-size: 0.61rem;
      font-weight: 600;
      letter-spacing: 0.13em;
      text-transform: uppercase;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .toolbar-tools {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      margin-inline-end: 10px;
    }

    .language-picker {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      height: 38px;
      padding: 0 9px;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 11px;
      background: rgba(30, 41, 59, 0.64);
      color: #e2e8f0;
    }

    .language-picker mat-icon {
      width: 18px;
      height: 18px;
      color: #93c5fd;
      font-size: 18px;
    }

    .language-picker select {
      max-width: 108px;
      padding: 2px 1px;
      border: 0;
      background: transparent;
      color: inherit;
      font-family: inherit;
      font-size: 0.78rem;
      font-weight: 650;
      cursor: pointer;
      outline: none;
    }

    .language-picker select:focus-visible {
      outline: 2px solid #60a5fa;
      outline-offset: 2px;
      border-radius: 4px;
    }

    .language-picker option {
      background: #ffffff;
      color: #0f172a;
    }

    .theme-toggle {
      color: #dbeafe;
    }

    .theme-toggle:hover {
      background: rgba(148, 163, 184, 0.14);
    }

    .account-button {
      display: inline-flex;
      align-items: center;
      gap: 9px;
      min-height: 46px;
      padding: 4px 10px 4px 6px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      color: #f8fafc;
    }

    .account-avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: linear-gradient(135deg, #60a5fa, #2563eb);
      color: #ffffff;
      font-size: 0.72rem;
      font-weight: 800;
      letter-spacing: 0.03em;
    }

    .account-copy {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      max-width: 160px;
      line-height: 1.1;
    }

    .account-copy strong {
      overflow: hidden;
      max-width: 100%;
      font-size: 0.82rem;
      font-weight: 600;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .account-copy small {
      margin-top: 3px;
      color: #94a3b8;
      font-size: 0.65rem;
    }

    .account-chevron {
      width: 18px;
      height: 18px;
      color: #94a3b8;
      font-size: 18px;
    }

    .toolbar-login {
      color: #e2e8f0;
      font-weight: 600;
    }

    .toolbar-signup {
      min-height: 40px;
      margin-inline-start: 8px;
      border-radius: 11px;
      background: #f8fafc;
      color: #0f172a;
      font-weight: 700;
    }

    .toolbar-signup .mat-icon {
      width: 17px;
      height: 17px;
      margin-inline-start: 4px;
      font-size: 17px;
    }

    .app-sidenav-container {
      height: calc(100dvh - var(--toolbar-height));
      background: transparent;
    }

    .app-sidenav {
      display: flex;
      width: 272px;
      flex-direction: column;
      border-inline-end: 1px solid rgba(203, 213, 225, 0.72);
      background:
        linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.98));
      box-shadow: 20px 0 50px -42px rgba(15, 23, 42, 0.55);
    }

    :host-context(html[dir='rtl']) .app-sidenav {
      box-shadow: -20px 0 50px -42px rgba(15, 23, 42, 0.55);
    }

    .nav-scroll {
      flex: 1;
      overflow-y: auto;
      padding: 18px 0 20px;
    }

    .nav-section {
      margin-bottom: 14px;
    }

    .nav-label {
      margin: 0 24px 7px;
      color: var(--cm-muted-light);
      font-size: 0.64rem;
      font-weight: 700;
      letter-spacing: 0.16em;
      text-transform: uppercase;
    }

    .nav-list {
      padding: 0;
    }

    .nav-link {
      width: auto;
      height: 46px;
      margin: 2px 12px;
      border-radius: 12px;
      color: #475569;
      transition: background-color 0.18s ease, color 0.18s ease, transform 0.18s ease;
    }

    .nav-link:hover {
      background: #f1f5f9;
      color: var(--cm-ink);
    }

    .nav-link mat-icon {
      color: #64748b;
    }

    .nav-link.active {
      background: linear-gradient(90deg, #e8f1ff, #f3f8ff);
      color: var(--cm-primary-dark);
      font-weight: 700;
    }

    .nav-link.active mat-icon {
      color: var(--cm-primary);
    }

    .sidebar-promo {
      position: relative;
      margin: 26px 14px 0;
      padding: 18px;
      overflow: hidden;
      border: 1px solid rgba(191, 219, 254, 0.9);
      border-radius: 18px;
      background:
        radial-gradient(140px 90px at 100% 0%, rgba(147, 197, 253, 0.5), transparent 70%),
        linear-gradient(145deg, #f8fbff, #eef5ff);
    }

    .sidebar-promo-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      margin-bottom: 11px;
      border-radius: 10px;
      background: #ffffff;
      color: var(--cm-primary);
      box-shadow: 0 6px 16px -10px rgba(37, 99, 235, 0.55);
    }

    .sidebar-promo-icon mat-icon {
      width: 19px;
      height: 19px;
      font-size: 19px;
    }

    .sidebar-promo strong {
      display: block;
      color: #172554;
      font-size: 0.88rem;
      font-weight: 700;
    }

    .sidebar-promo p {
      margin: 5px 0 14px;
      color: #64748b;
      font-size: 0.76rem;
      line-height: 1.5;
    }

    .sidebar-promo a {
      width: 100%;
      min-height: 38px;
      border-radius: 10px;
      font-size: 0.8rem;
    }

    .sidenav-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 14px 22px 18px;
      border-top: 1px solid rgba(226, 232, 240, 0.9);
      color: var(--cm-muted-light);
      font-size: 0.68rem;
      font-weight: 600;
    }

    .sidenav-footer mat-icon {
      width: 16px;
      height: 16px;
      color: #cbd5e1;
      font-size: 16px;
    }

    .app-content {
      background: transparent;
    }

    .content-inner {
      min-height: 100%;
      padding: 30px clamp(18px, 3vw, 38px) 46px;
    }

    @media (max-width: 960px) {
      .app-toolbar {
        padding: 0 12px;
      }

      .app-sidenav {
        width: min(86vw, 312px);
        border-start-start-radius: 0;
        border-start-end-radius: 20px;
        border-end-end-radius: 20px;
        border-end-start-radius: 0;
      }

      .content-inner {
        padding: 24px 16px 36px;
      }
    }

    @media (max-width: 600px) {
      :host {
        --toolbar-height: 60px;
      }

      .app-toolbar {
        padding: 0 8px;
      }

      .menu-toggle {
        margin-inline-end: 4px;
      }

      .brand-mark {
        width: 34px;
        height: 34px;
        border-radius: 10px;
      }

      .brand-mark img {
        width: 24px;
        height: 24px;
      }

      .brand-copy small {
        display: none;
      }

      .brand-copy strong {
        font-size: 0.98rem;
      }

      .account-copy,
      .account-chevron {
        display: none;
      }

      .account-button {
        min-width: 42px;
        min-height: 42px;
        padding: 4px;
      }

      .toolbar-login {
        min-width: auto;
        padding: 0 8px;
        font-size: 0.82rem;
      }

      .toolbar-signup {
        min-width: auto;
        min-height: 38px;
        margin-inline-start: 2px;
        padding: 0 12px;
        font-size: 0.8rem;
      }

      .toolbar-signup .mat-icon {
        display: none;
      }

      .toolbar-tools {
        gap: 0;
        margin-inline-end: 2px;
      }

      .language-picker {
        height: 34px;
        gap: 3px;
        padding: 0 6px;
      }

      .language-picker mat-icon {
        width: 16px;
        height: 16px;
        font-size: 16px;
      }

      .language-picker select {
        max-width: 64px;
        font-size: 0.72rem;
      }

      .theme-toggle {
        width: 36px;
        height: 36px;
        padding: 6px;
      }

      .content-inner {
        padding: 20px 12px 32px;
      }
    }
  `]
})
export class ShellComponent {
  private readonly breakpointObserver = inject(BreakpointObserver);
  private readonly destroyRef = inject(DestroyRef);

  readonly language = inject(LanguageService);
  readonly theme = inject(ThemeService);
  isMobile = false;

  constructor(public authService: AuthService) {
    this.breakpointObserver
      .observe('(max-width: 960px)')
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ matches }) => {
        this.isMobile = matches;
      });
  }

  changeLanguage(code: string): void {
    this.language.setLanguage(code);
  }

  closeIfMobile(sidenav: MatSidenav): void {
    if (this.isMobile) {
      sidenav.close();
    }
  }

  getInitials(): string {
    const displayName = this.authService.userDisplayName()
      || this.authService.currentUser()?.username
      || 'Player';

    return displayName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase();
  }
}
