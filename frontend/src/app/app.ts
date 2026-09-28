import { Component, OnInit, signal, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';

import { ApiService, readableError } from './api.service';

@Component({
  selector: 'app-root',
  imports: [RouterLink, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements OnInit {
  readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly signOutError = signal('');
  readonly currentUrl = signal('/');
  readonly accountMenuOpen = signal(false);

  ngOnInit(): void {
    this.currentUrl.set(this.router.url);
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.currentUrl.set(event.urlAfterRedirects);
    });
    void this.api.refreshSession().catch(() => this.api.currentUser.set({ authenticated: false }));
  }

  returnParams(): { returnUrl?: string } {
    const url = this.currentUrl();
    // Don't loop back to the auth pages themselves.
    return url === '/' || url.startsWith('/login') || url.startsWith('/signup')
      ? {}
      : { returnUrl: url };
  }

  navActive(fragment: string): boolean {
    const url = this.currentUrl();
    return url.includes(`#${fragment}`) || (fragment === 'elections' && url === '/');
  }

  toggleAccountMenu(): void {
    this.accountMenuOpen.update((open) => !open);
  }

  closeAccountMenu(): void {
    this.accountMenuOpen.set(false);
  }

  async signOut(): Promise<void> {
    this.closeAccountMenu();
    this.signOutError.set('');
    try {
      await this.api.logout();
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.signOutError.set(readableError(error));
    }
  }
}
