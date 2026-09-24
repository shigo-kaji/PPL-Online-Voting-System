import { DatePipe } from '@angular/common';
import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ApiService, readableError } from '../api.service';
import { Election } from '../models';

@Component({
  selector: 'app-home-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './home.page.html',
})
export class HomePage implements OnInit {
  readonly api = inject(ApiService);

  readonly elections = signal<Election[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.api.refreshSession();
      if (user.authenticated) this.elections.set(await this.api.listElections());
    } catch (error) {
      this.error.set(readableError(error));
    } finally {
      this.loading.set(false);
    }
  }
}
