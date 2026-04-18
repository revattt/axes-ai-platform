import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HttpHeaders } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  // Update this to your actual .NET port!
  private apiUrl = 'https://localhost:7115/api/Auth';

  constructor(private http: HttpClient) { }

  login(credentials: any): Observable<string> {
    // We expect a raw string (the JWT), not a JSON object, so we must tell Angular's HttpClient.
    return this.http.post(`${this.apiUrl}/login`, credentials, { responseType: 'text' });
  }

  register(userData: any): Observable<any> {
    // Unlike login which returns a raw string token, register usually returns a standard 200 OK or JSON
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  saveToken(token: string) {
    localStorage.setItem('jwt_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  logout() {
    localStorage.removeItem('jwt_token');
  }

  getProfile() {
    const token = localStorage.getItem('jwt_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    return this.http.get<any>(`${this.apiUrl}/profile`, { headers });
  }
}
