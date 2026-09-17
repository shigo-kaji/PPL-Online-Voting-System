import { Routes } from '@angular/router';
import { BallotPage } from './pages/ballot.page';
import { HomePage } from './pages/home.page';
import { LoginPage } from './pages/login.page';
import { ResultsPage } from './pages/results.page';

export const routes: Routes = [
  { path: '', component: HomePage, title: 'Elections | CommonGround' },
  { path: 'login', component: LoginPage, title: 'Sign in | CommonGround' },
  { path: 'elections/:id', component: BallotPage, title: 'Cast your vote | CommonGround' },
  { path: 'elections/:id/results', component: ResultsPage, title: 'Election results | CommonGround' },
  { path: '**', redirectTo: '' },
];
