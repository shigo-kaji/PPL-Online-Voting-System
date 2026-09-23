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
  readonly currentIndex = signal(0);
  readonly swipeDirection = signal<'left' | 'right' | null>(null);
  readonly currentCandidate = computed(() => {
    const current = this.election();
    const candidates = current?.candidates ?? [];
    if (!candidates.length) return null;
    const safeIndex = Math.min(Math.max(this.currentIndex(), 0), candidates.length - 1);
    return candidates[safeIndex] ?? null;
  });
  readonly previousCandidate = computed(() => {
    const current = this.election();
    const candidates = current?.candidates ?? [];
    if (!candidates.length) return null;
    const previousIndex = (this.currentIndex() - 1 + candidates.length) % candidates.length;
    return candidates[previousIndex] ?? null;
  });
  readonly nextCandidate = computed(() => {
    const current = this.election();
    const candidates = current?.candidates ?? [];
    if (!candidates.length) return null;
    const nextIndex = (this.currentIndex() + 1) % candidates.length;
    return candidates[nextIndex] ?? null;
  });
  readonly selectedCandidate = computed(() => this.currentCandidate() ?? this.election()?.candidates.find(candidate => candidate.id === this.selectedId()) ?? null);
  readonly loading = signal(true);
  readonly signedIn = signal(false);
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
      this.signedIn.set(!!user.authenticated);
      const current = await this.api.getElection(id);
      this.election.set(current);
      const firstCandidate = current.candidates[0];
      if (firstCandidate) {
        this.currentIndex.set(0);
        this.selectedId.set(firstCandidate.id);
      }
    } catch (error) {
      this.error.set(readableError(error));
    } finally {
      this.loading.set(false);
    }
  }

  moveSelection(step: number): void {
    const candidates = this.election()?.candidates ?? [];
    if (!candidates.length) return;
    this.swipeDirection.set(step < 0 ? 'left' : 'right');
    const nextIndex = (this.currentIndex() + step + candidates.length) % candidates.length;
    this.currentIndex.set(nextIndex);
    this.selectedId.set(candidates[nextIndex].id);
    this.error.set('');
    window.setTimeout(() => {
      this.swipeDirection.set(null);
    }, 520);
  }

  initials(name: string): string {
    return name.split(/\s+/).slice(0, 2).map(part => part.charAt(0)).join('').toUpperCase();
  }

  review(): void {
    this.error.set('');
    if (!this.signedIn()) {
      void this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      return;
    }
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