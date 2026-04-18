import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth';
import { FormsModule } from '@angular/forms'; // Required for inputs
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css']
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit() {
    this.authService.login(this.credentials).subscribe({
      next: (token) => {
        // 1. Save the token to the browser's memory
        this.authService.saveToken(token);
        // 2. Redirect the user to the dashboard
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        // If .NET throws a 400 or 401, catch it here
        this.errorMessage = 'Invalid username or password.';
      }
    });
  }
}
