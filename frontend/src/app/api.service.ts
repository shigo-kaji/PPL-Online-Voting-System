import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { Election, ElectionResults, Voter } from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  readonly currentUser = signal<Voter | null>(null);
  private csrfToken = '';

  constructor(private readonly http: HttpClient) {}

  async refreshSession(): Promise<Voter> {
    const user = await firstValueFrom(this.http.get<Voter>('/api/auth/me/'));
    this.currentUser.set(user);
    return user;
  }

  async refreshCsrf(): Promise<void> {
    const response = await firstValueFrom(this.http.get<{ csrfToken: string }>('/api/auth/csrf/'));
    this.csrfToken = response.csrfToken;
  }

  async login(username: string, password: string): Promise<void> {
    await this.refreshCsrf();
    await firstValueFrom(this.http.post('/api/auth/login/', { username, password }, {
      headers: this.csrfHeaders(),
    }));
    // Django rotates its CSRF token on login.
    await this.refreshCsrf();
    await this.refreshSession();
  }

  async register(username: string, password: string): Promise<void> {
    await this.refreshCsrf();
    await firstValueFrom(this.http.post('/api/auth/register/', { username, password }, {
      headers: this.csrfHeaders(),
    }));
    // Django rotates its CSRF token when the new user is logged in.
    await this.refreshCsrf();
    await this.refreshSession();
  }

  async logout(): Promise<void> {
    await this.refreshCsrf();
    await firstValueFrom(this.http.post('/api/auth/logout/', {}, { headers: this.csrfHeaders() }));
    this.currentUser.set({ authenticated: false });
    this.csrfToken = '';
  }

  listElections(): Promise<Election[]> {
    return firstValueFrom(this.http.get<Election[]>('/api/elections/'));
  }

  getElection(id: number): Promise<Election> {
    return firstValueFrom(this.http.get<Election>(`/api/elections/${id}/`));
  }

  async castVote(electionId: number, candidateId: number): Promise<void> {
    await this.refreshCsrf();
    await firstValueFrom(this.http.post(`/api/elections/${electionId}/vote/`, {
      candidate_id: candidateId,
    }, { headers: this.csrfHeaders() }));
  }

  getResults(id: number): Promise<ElectionResults> {
    return firstValueFrom(this.http.get<ElectionResults>(`/api/elections/${id}/results/`));
  }

  private csrfHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-CSRFToken': this.csrfToken });
  }
}

export function readableError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'We could not reach the voting server. Please try again shortly.';
    const body: unknown = error.error;
    if (body && typeof body === 'object') {
      const details = body as Record<string, unknown>;
      if (typeof details['detail'] === 'string') return details['detail'];
      for (const value of Object.values(details)) {
        if (Array.isArray(value) && value.length) return String(value[0]);
        if (typeof value === 'string') return value;
      }
    }
  }
  return 'Something went wrong. Please try again.';
}