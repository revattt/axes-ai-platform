import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [RouterModule], // <-- Must import RouterModule here
  templateUrl: './layout.html'
})
export class LayoutComponent {
  constructor(private authService: AuthService, private router: Router) { }

  onLogout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
