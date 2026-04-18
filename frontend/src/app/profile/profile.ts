import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth'; 

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile.html'
})
export class ProfileComponent implements OnInit {
  userProfile: any = null;
  isLoading = true;
  errorMessage = '';

  constructor(private authService: AuthService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.authService.getProfile().subscribe({
      next: (data) => {
        this.userProfile = data;
        this.isLoading = false;
        this.cdr.detectChanges()
      },
      error: (err) => {
        console.error("Failed to load profile", err);
        this.errorMessage = "Could not load user data. Please log in again.";
        this.isLoading = false;
        this.cdr.detectChanges()
      }
    });
  }
}
