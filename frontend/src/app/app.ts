import { Component, OnInit, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { ApiService, readableError } from './api.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  readonly signOutError = signal('');
  readonly currentUrl = signal('/');

  constructor(readonly api: ApiService, private readonly router: Router) {}

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.router.events.subscribe(event => {
      if (event instanceof NavigationEnd) this.currentUrl.set(event.urlAfterRedirects);
    });
    void this.api.refreshSession().catch(() => this.api.currentUser.set({ authenticated: false }));
  }

  returnParams(): { returnUrl?: string } {
    const url = this.currentUrl();
    // Don't loop back to the auth pages themselves.
    return url === '/' || url.startsWith('/login') || url.startsWith('/signup') ? {} : { returnUrl: url };
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