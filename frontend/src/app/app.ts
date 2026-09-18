import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';

import { ApiService, readableError } from './api.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly signOutError = signal('');

  constructor(
    readonly api: ApiService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.api.refreshSession().catch(() => this.api.currentUser.set({ authenticated: false }));
  }

  async signOut(): Promise<void> {
    this.signOutError.set('');
    try {
      await this.api.logout();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.signOutError.set(readableError(error));
    }
  }
}
