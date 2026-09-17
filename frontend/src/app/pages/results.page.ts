import { Component, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService, readableError } from '../api.service';
import { Election, ElectionResults } from '../models';

@Component({
  selector: 'app-results-page',
  imports: [RouterLink],
  templateUrl: './results.page.html',
})
export class ResultsPage implements OnInit {
  readonly election = signal<Election | null>(null);
  readonly results = signal<ElectionResults | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor(
    private readonly api: ApiService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  async ngOnInit(): Promise<void> {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (!Number.isInteger(id) || id < 1) {
      await this.router.navigateByUrl('/');
      return;
    }
    try {
      const user = await this.api.refreshSession();
      if (!user.authenticated) {
        await this.router.navigateByUrl('/login');
        return;
      }
      const election = await this.api.getElection(id);
      this.election.set(election);
      if (election.status === 'closed') this.results.set(await this.api.getResults(id));
    } catch (error) {
      this.error.set(readableError(error));
    } finally {
      this.loading.set(false);
    }
  }

  percentage(votes: number, total: number): number {
    return total ? Math.round((votes / total) * 100) : 0;
  }
}
