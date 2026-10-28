import { Routes } from '@angular/router';
import { ShellComponent } from './layout/shell/shell.component';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: 'auth',
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
      },
      {
        path: 'register',
        loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
      },
      { path: '', redirectTo: 'login', pathMatch: 'full' }
    ]
  },
  {
    path: 'kids/play',
    loadComponent: () => import('./features/home/kids-game.component').then(m => m.KidsGameComponent)
  },
  {
    path: 'kids/learn',
    loadComponent: () => import('./features/home/kids-learn.component').then(m => m.KidsLearnComponent)
  },
  {
    path: 'kids',
    loadComponent: () => import('./features/home/kids-home.component').then(m => m.KidsHomeComponent)
  },
  {
    path: '',
    component: ShellComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'play',
        loadComponent: () => import('./features/play/play.component').then(m => m.PlayComponent)
      },
      {
        path: 'puzzles',
        loadComponent: () => import('./features/puzzles/puzzles.component').then(m => m.PuzzlesComponent)
      },
      {
        path: 'openings',
        loadComponent: () => import('./features/openings/openings.component').then(m => m.OpeningsComponent)
      },
      {
        path: 'learn',
        loadComponent: () => import('./features/learn/learn.component').then(m => m.LearnComponent)
      },
      {
        path: 'learn/:courseId/:lessonId',
        loadComponent: () =>
          import('./features/learn/lesson-player.component').then(m => m.LessonPlayerComponent)
      },
      {
        path: 'analysis',
        loadComponent: () => import('./features/analysis/analysis.component').then(m => m.AnalysisComponent)
      },
      {
        path: 'game/bot',
        loadComponent: () => import('./features/game/game-vs-bot.component').then(m => m.GameVsBotComponent)
      },
      {
        path: 'game/:id',
        loadComponent: () => import('./features/game/game.component').then(m => m.GameComponent)
      }
    ]
  },
  { path: '**', redirectTo: '' }
];
