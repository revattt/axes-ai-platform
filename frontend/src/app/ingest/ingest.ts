import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProjectService } from '../project'; // Check your path!

@Component({
  selector: 'app-ingest',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ingest.html'
})
export class IngestComponent {
  newProjectTitle = '';
  priority = 'Normal';
  department = 'Sales';
  selectedFile: File | null = null;

  isUploading = false;
  fileError = '';
  showSuccessToast = false;

  constructor(private projectService: ProjectService, private cdr: ChangeDetectorRef) { }

  onFileSelected(event: any) {
    this.fileError = ''; // Clear previous errors
    const file: File = event.target.files[0];

    if (!file) return;

    // 1. SAFEGURAD: Is it a PDF?
    if (file.type !== 'application/pdf') {
      this.fileError = 'Invalid format. Only PDF documents are strictly permitted.';
      this.selectedFile = null;
      return;
    }

    // 2. SAFEGUARD: Is it under 5MB? (5 * 1024 * 1024 bytes)
    if (file.size > 5242880) {
      this.fileError = 'File exceeds maximum payload size of 5.0 MB.';
      this.selectedFile = null;
      return;
    }

    this.selectedFile = file;
  }

  onUpload() {
    if (!this.newProjectTitle || !this.selectedFile) return;

    this.isUploading = true;
    console.log("SENDING TO C#:", this.newProjectTitle, this.priority, this.department);

    this.projectService.uploadProject(this.newProjectTitle, this.priority, this.department, this.selectedFile).subscribe({
      next: () => {
        // 1. Reset the UI
        this.isUploading = false;
        this.newProjectTitle = '';
        this.selectedFile = null;

        // 2. Trigger the Toast
        this.showSuccessToast = true;

        // 3. SMASH THE UI TO WAKE UP ANGULAR
        this.cdr.detectChanges();

        // 4. Hide the toast after 4 seconds and smash again
        setTimeout(() => {
          this.showSuccessToast = false;
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err) => {
        console.error('Upload failed', err);
        this.fileError = 'Uplink failed. The server rejected the payload.';
        this.isUploading = false;

        // SMASH ON ERROR TOO!
        this.cdr.detectChanges();
      }
    });
  }
}
