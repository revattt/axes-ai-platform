import { Component, ChangeDetectorRef } from '@angular/core'; // <-- 1. IMPORTED HERE
import { CommonModule } from '@angular/common';
import { ProjectService } from '../project';

@Component({
  selector: 'app-knowledge-base',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knowledge-base.html'
})
export class KnowledgeBaseComponent {
  selectedFile: File | null = null;
  isTraining: boolean = false;
  trainingResult: any = null;
  errorMessage: string = '';

  constructor(
    private projectService: ProjectService,
    private cdr: ChangeDetectorRef // <-- 2. INJECTED HERE
  ) { }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
      this.errorMessage = '';
      this.trainingResult = null;
    } else {
      this.selectedFile = null;
      this.errorMessage = 'Please select a valid PDF file.';
    }
  }

  trainAI() {
    if (!this.selectedFile) return;

    this.isTraining = true;
    this.errorMessage = '';
    this.trainingResult = null;

    // Nudge Angular to show the loading spinner immediately
    this.cdr.detectChanges();

    this.projectService.trainKnowledgeBase(this.selectedFile).subscribe({
      next: (response: any) => {
        this.trainingResult = response;
        this.isTraining = false;
        this.selectedFile = null; // Reset for the next upload

        // <-- 3. NUDGE ANGULAR TO SHOW THE SUCCESS MESSAGE!
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("Training Error:", err);
        this.errorMessage = 'Failed to train the AI. Ensure the Python server is running.';
        this.isTraining = false;

        // Nudge Angular to hide the spinner and show the error
        this.cdr.detectChanges();
      }
    });
  }
}
