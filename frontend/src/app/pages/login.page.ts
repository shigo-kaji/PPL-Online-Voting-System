import { Component, signal, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService, readableError } from '../api.service';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.page.html',
})
export class LoginPage {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly route = inject(ActivatedRoute);

  readonly submitting = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup({
    username: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  private returnUrl(): string {
    const url = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/';
    // Only allow in-app paths, never external URLs.
    return url.startsWith('/') && !url.startsWith('//') ? url : '/';
  }

  async submit(): Promise<void> {
    this.error.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      await this.api.login(
        this.form.controls.username.value.trim(),
        this.form.controls.password.value,
      );
      await this.router.navigateByUrl(this.returnUrl());
    } catch (error) {
      this.error.set(readableError(error));
    } finally {
      this.submitting.set(false);
    }
  }
}
