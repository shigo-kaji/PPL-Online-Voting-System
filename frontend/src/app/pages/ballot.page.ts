import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService, readableError } from '../api.service';
import { Election } from '../models';

@Component({
  selector: 'app-ballot-page',
  imports: [DatePipe, RouterLink],
  templateUrl: './ballot.page.html',
})
export class BallotPage implements OnInit {
  readonly election = signal<Election | null>(null);
  readonly selectedId = signal<number | null>(null);
  readonly selectedCandidate = computed(() =>
    this.election()?.candidates.find((candidate) => candidate.id === this.selectedId()),
  );
  readonly loading = signal(true);
  readonly submitting = signal(false);
  readonly reviewing = signal(false);
  readonly success = signal(false);
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
      this.election.set(await this.api.getElection(id));
    } catch (error) {
      this.error.set(readableError(error));
    } finally {
      this.loading.set(false);
    }
  }

  initials(name: string): string {
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join('')
      .toUpperCase();
  }

  review(): void {
    this.error.set('');
    if (!this.selectedId()) {
      this.error.set('Select a candidate before continuing.');
      return;
    }
    this.reviewing.set(true);
  }

  async confirm(): Promise<void> {
    const election = this.election();
    const candidateId = this.selectedId();
    if (!election || !candidateId || this.submitting()) return;
    this.error.set('');
    this.submitting.set(true);
    try {
      await this.api.castVote(election.id, candidateId);
      this.reviewing.set(false);
      this.success.set(true);
    } catch (error) {
      this.reviewing.set(false);
      this.error.set(readableError(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
