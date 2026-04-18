import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { ProjectService } from '../project'; // Check your import path!

Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './analytics.html'
})
export class AnalyticsComponent implements OnInit {
  // Here are the variables you predicted!
  isLoading = true;
  errorMessage = '';
  stats: any = null;

  confidenceChartInstance: any;
  statusChartInstance: any;

  constructor(private projectService: ProjectService, private cdr: ChangeDetectorRef) { }

  ngOnInit() {
    this.fetchRealAnalytics();
  }

  fetchRealAnalytics() {
    this.projectService.getAnalytics().subscribe({
      next: (data) => {
        this.stats = data; // Assign the real SQL data!
        this.isLoading = false;
        this.cdr.detectChanges(); // Smash the UI to wake up

        // Wait a microsecond for the HTML canvas to render before drawing the charts
        setTimeout(() => {
          this.renderCharts();
        }, 10);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "Failed to load telemetry data from server.";
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  renderCharts() {
    const canvasExists = document.getElementById('confidenceChart');
    if (!canvasExists) {
      console.warn("Canvas not ready yet. Retrying in 50ms...");
      setTimeout(() => this.renderCharts(), 50); // Loop until Angular finishes drawing!
      return;
    }
    // Destroy old charts to prevent overlapping glitches if the page reloads
    if (this.confidenceChartInstance) this.confidenceChartInstance.destroy();
    if (this.statusChartInstance) this.statusChartInstance.destroy();

    this.confidenceChartInstance = new Chart('confidenceChart', {
      type: 'line',
      data: {
        labels: this.stats.trendDates,
        datasets: [{
          label: 'Average AI Confidence (%)',
          data: this.stats.trendScores, // REAL DATA
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: false, min: 50, max: 100, grid: { color: '#f1f5f9' } },
          x: { grid: { display: false } }
        }
      }
    });

    this.statusChartInstance = new Chart('triageChart', { // Changed ID
      type: 'doughnut',
      data: {
        labels: ['Auto-Approved (>90%)', 'Needs Review (70-89%)', 'Critical (<70%)'],
        datasets: [{
          data: this.stats.triageCounts, // Read the new C# array!
          backgroundColor: [
            '#22c55e', // Green (Auto)
            '#f59e0b', // Amber (Review)
            '#ef4444'  // Red (Critical)
          ],
          borderWidth: 0,
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { boxWidth: 12, font: { size: 11 } } // Make legend fit nicely
          }
        }
      }
    });
  }
}
