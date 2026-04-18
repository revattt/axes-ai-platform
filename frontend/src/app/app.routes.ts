import { Routes } from '@angular/router';
import { LoginComponent } from './login/login';
import { DashboardComponent } from './dashboard/dashboard';
import { RegisterComponent } from './register/register';
import { LayoutComponent } from './layout/layout';
import { ProfileComponent } from './profile/profile';
import { AnalyticsComponent } from './analytics/analytics';
import { IngestComponent } from './ingest/ingest';
import { KnowledgeBaseComponent } from './knowledge-base/knowledge-base';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Anything inside these children will automatically have the Sidebar attached!
  {
    path: '',
    component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'profile', component: ProfileComponent },
      { path: 'analytics', component: AnalyticsComponent },
      { path: 'ingest', component: IngestComponent },
      { path: 'knowledge-base', component: KnowledgeBaseComponent }
    ]
  }
];
