import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProjectService } from '../project';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html'
})
export class DashboardComponent implements OnInit, OnDestroy {
  // Only the variables needed for the Vault!
  projects: any[] = [];
  selectedProjectDetails: any = null;
  refreshTimer: any;
  // RAG Generator State
  rfpQuestion: string = '';
  generatedDraft: string = '';
  usedSources: string[] = [];
  isGenerating: boolean = false;
  private readonly hiddenInsightKeys = new Set([
    'risk_assessment',
    'ai_confidence_score',
    'mandatory_tech_stack',
    'budget_mentioned',
    'submission_deadline',
    'compliance_requirements'
  ]);

  constructor(private projectService: ProjectService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.fetchProjects();

    // SMART POLLING: Check the database every 3 seconds for AI updates
    this.refreshTimer = setInterval(() => {
      // Only bother the server if we actually have something 'Processing'
      const isProcessingSomething = this.projects.some(p => p.status === 'Processing');
      if (isProcessingSomething) {
        this.fetchProjects(); // Quietly refresh the data in the background
      }
    }, 3000);
  }

  // We must destroy the timer if the user leaves the page, otherwise it runs forever!
  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }

  fetchProjects() {
    // Assuming you have a getProjects() method in your service to load the table!
    this.projectService.getMyProjects().subscribe({
      next: (data) => {
        console.log("RAW DATA FROM C#:", data);
        this.projects = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Failed to load vault data", err)
    });
  }

  openDetails(project: any) {

    this.selectedProjectDetails = { ...project };

 
    if (this.selectedProjectDetails.extractedJson) {
      try {
        this.selectedProjectDetails.parsedJson =
          typeof this.selectedProjectDetails.extractedJson === 'string'
            ? JSON.parse(this.selectedProjectDetails.extractedJson)
            : this.selectedProjectDetails.extractedJson;
      } catch (e) {
        // Fallback just in case the AI messed up the formatting
        this.selectedProjectDetails.parsedJson = { raw_data: this.selectedProjectDetails.extractedJson };
      }
    } else {
      // If the AI hasn't finished yet, show this
      this.selectedProjectDetails.parsedJson = { status: "Awaiting AI payload..." };
    }
  }

  closeDetails() {
    this.selectedProjectDetails = null;
  }

  deleteDocument(projectId: number) {
    if (!confirm('Are you sure you want to permanently delete this document and its AI payload?')) return;

    this.projectService.deleteProject(projectId).subscribe({
      next: () => {
        // Instantly remove it from the UI array without reloading the page
        this.projects = this.projects.filter(p => p.id !== projectId);
        this.selectedProjectDetails = null; // Close the drawer
        this.cdr.detectChanges(); // Smash the UI
      },
      error: (err) => console.error("Failed to delete document", err)
    });
  }

  viewSourcePdf(projectId: number) {
    this.projectService.getProjectPdf(projectId).subscribe({
      next: (blob) => {
        // 1. Create a secure local URL for the downloaded file
        const fileUrl = URL.createObjectURL(blob);

        // 2. Open it in a new browser tab instantly
        window.open(fileUrl, '_blank');
      },
      error: (err) => {
        console.error(err);
        alert("Failed to locate the physical PDF on the server.");
      }
    });
  }

  // Helper to check if the AI flagged a specific field
  hasRisk(keyword: string): boolean {
    // 1. Safety check: Does the risk array even exist?
    const risks = this.selectedProjectDetails?.parsedJson?.risk_assessment;
    if (!risks || !Array.isArray(risks)) {
      return false;
    }

    // 2. Scan the array: Does any issue mention our keyword? (Case insensitive)
    return risks.some((risk: any) =>
      risk.issue && risk.issue.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  // Bonus Helper: Get the exact text the AI wrote so we can display it!
  getRiskMessage(keyword: string): string {
    const risks = this.selectedProjectDetails?.parsedJson?.risk_assessment;
    if (!risks || !Array.isArray(risks)) return '';

    const foundRisk = risks.find((risk: any) =>
      risk.issue && risk.issue.toLowerCase().includes(keyword.toLowerCase())
    );

    return foundRisk ? foundRisk.issue : '';
  }

  getReadableLabel(rawKey: string): string {
    return rawKey
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  getDisplayValue(value: unknown): string {
    if (value === null || value === undefined) return 'Not specified';
    if (typeof value === 'string') return value.trim() || 'Not specified';
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return 'Structured value';
  }

  getGenericInsights(): Array<{ key: string; value: unknown }> {
    const parsed = this.selectedProjectDetails?.parsedJson;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return [];

    return Object.entries(parsed)
      .filter(([key, value]) => !this.hiddenInsightKeys.has(key) && value !== undefined)
      .map(([key, value]) => ({ key, value }));
  }

  isInsightList(value: unknown): boolean {
    return Array.isArray(value);
  }

  insightListItems(value: unknown): any[] {
    return Array.isArray(value) ? value : [];
  }

  // RAG Generation Function
  // RAG Generation Function
  generateDraft() {
    if (!this.rfpQuestion.trim()) return;

    this.isGenerating = true;
    this.generatedDraft = '';
    this.usedSources = [];

    // Force UI to show the spinner immediately
    this.cdr.detectChanges();

    this.projectService.askRfpQuestion(this.rfpQuestion).subscribe({
      next: (response: any) => {
        this.generatedDraft = response.generated_answer;
        this.usedSources = response.sources_used;
        this.isGenerating = false;

        // Command Angular to instantly redraw the screen with the new data!
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error("RAG Engine Error:", err);
        alert("Failed to connect to the AI Knowledge Base.");
        this.isGenerating = false;

        // Command Angular to hide the spinner if it crashes
        this.cdr.detectChanges();
      }
    });
  }
}
