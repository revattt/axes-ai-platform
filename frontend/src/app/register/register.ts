import { Component } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../auth'; // Check this path matches your auth file!
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.html'
})
export class RegisterComponent {
  userData = { username: '', email: '', password: '' };
  errorMessage = '';
  isLoading = false;
  successMessage = '';

  constructor(private authService: AuthService, private router: Router) { }

  onSubmit() {
    this.isLoading = true;
    this.errorMessage = ''; // Clear old errors
    this.successMessage = ''; // Clear old success messages

    this.authService.register(this.userData).subscribe({
      next: () => {
        // Show the success message and keep the button in "loading" state
        this.successMessage = 'Operative Profile Created! Redirecting to login...';

        // Wait exactly 2 seconds so the user can read the message, then redirect
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      },
      error: (err) => {
        this.isLoading = false;
        // If your C# backend returns plain text instead of JSON on success, Angular might think it's an error. 
        // We catch that edge case here!
        if (err.status === 200) {
          this.successMessage = 'Operative Profile Created! Redirecting to login...';
          setTimeout(() => { this.router.navigate(['/login']); }, 2000);
        } else {
          this.errorMessage = err.error?.message || 'Registration failed. Password must contain an uppercase letter, a number, and a special character.';
        }
      }
    });
  }
}
