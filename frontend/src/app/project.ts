import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';
import { environment } from '../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ProjectService {
  private apiUrl = `${environment.apiBaseUrl}/api/Project`;
  private aiUrl = environment.aiBaseUrl;

  constructor(private http: HttpClient) { }

  // Fetch all your projects
  getMyProjects(): Observable<any[]> {
    return this.http.get<any[]>(this.apiUrl);
  }

  // Upload a new PDF
  uploadProject(title: string, priority: string, department: string, file: File) {
    const token = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('priority', priority);
    formData.append('department', department);
    formData.append('file', file);

    // Make sure your URL is exactly what your backend expects!
    return this.http.post(`${this.apiUrl}/upload`, formData, { headers });
  }

  askRfpQuestion(question: string) {
    // If you are using C# authentication, include the token
    const token = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });

    // Send the question payload to the Python/C# backend
    // or leave it as the Python URL if Angular talks to Python directly for this test.
    return this.http.post(`${this.aiUrl}/ask`, { question: question }, { headers });
  }

  deleteProject(projectId: number) {
    const token = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.delete(`${this.apiUrl}/${projectId}`, { headers });
  }

  getAnalytics() {
    // We must pass the badge so C# knows WHOSE analytics to calculate
    const token = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // Adjust the URL if your controller routing is slightly different!
    return this.http.get<any>(`${this.apiUrl}/analytics`, { headers });
  }

  getProjectPdf(projectId: number) {
    const token = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    // CRITICAL: Tell Angular to expect a raw binary file, not JSON!
    return this.http.get(`${this.apiUrl}/${projectId}/pdf`, {
      headers,
      responseType: 'blob'
    });
  }

  trainKnowledgeBase(file: File) {
    const formData = new FormData();
    formData.append('file', file); // 'file' matches the parameter name in Python

    const token = localStorage.getItem('jwt_token');
    // Notice we do NOT set 'Content-Type'. The browser automatically sets it to 
    // 'multipart/form-data' with the correct boundary hash when using FormData.
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(`${this.aiUrl}/train`, formData, { headers });
  }
}
