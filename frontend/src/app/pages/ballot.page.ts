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
  readonly dragX = signal(0);
  readonly isDragging = signal(false);
  private pointerStartX = 0;
  private activePointerId: number | null = null;
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
  readonly detailsOpen = signal(false);
  readonly detailsClosing = signal(false);
  readonly galleryOpen = signal(false);
  readonly galleryIndex = signal(0);
  readonly galleryDirection = signal<'next' | 'previous' | null>(null);
  readonly gallerySlides = ['Portrait', 'Campus event', 'Community work'];
  private galleryPointerStartX = 0;
  readonly success = signal(false);
  readonly error = signal('');
  readonly dragTransform = computed(() => {
    const offset = this.dragX();
    return offset ? `translateX(${offset}px) rotate(${offset / 24}deg)` : '';
  });

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

  onPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('button')) return;
    this.pointerStartX = event.clientX;
    this.activePointerId = event.pointerId;
    this.isDragging.set(true);
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onPointerMove(event: PointerEvent): void {
    if (!this.isDragging() || event.pointerId !== this.activePointerId) return;
    this.dragX.set(event.clientX - this.pointerStartX);
  }

  onPointerUp(event: PointerEvent): void {
    if (!this.isDragging() || event.pointerId !== this.activePointerId) return;
    const distance = event.clientX - this.pointerStartX;
    this.isDragging.set(false);
    this.dragX.set(0);
    this.activePointerId = null;
    if (Math.abs(distance) >= 64) {
      this.moveSelection(distance < 0 ? 1 : -1);
    }
  }

  onPointerCancel(): void {
    this.isDragging.set(false);
    this.dragX.set(0);
    this.activePointerId = null;
  }

  openDetails(event: Event): void {
    event.stopPropagation();
    this.detailsClosing.set(false);
    this.detailsOpen.set(true);
  }

  closeDetails(): void {
    if (!this.detailsOpen() || this.detailsClosing()) return;
    this.detailsClosing.set(true);
    window.setTimeout(() => {
      this.detailsOpen.set(false);
      this.detailsClosing.set(false);
    }, 220);
  }

  openGallery(index: number): void {
    this.galleryIndex.set(index);
    this.galleryOpen.set(true);
  }

  closeGallery(): void {
    this.galleryOpen.set(false);
  }

  moveGallery(step: number): void {
    this.galleryDirection.set(step > 0 ? 'next' : 'previous');
    const nextIndex = (this.galleryIndex() + step + this.gallerySlides.length) % this.gallerySlides.length;
    this.galleryIndex.set(nextIndex);
    window.setTimeout(() => this.galleryDirection.set(null), 320);
  }

  onGalleryPointerDown(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('button')) return;
    this.galleryPointerStartX = event.clientX;
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  onGalleryPointerUp(event: PointerEvent): void {
    if ((event.target as HTMLElement).closest('button')) return;
    const distance = event.clientX - this.galleryPointerStartX;
    if (Math.abs(distance) >= 56) this.moveGallery(distance < 0 ? 1 : -1);
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