import { Component, signal } from '@angular/core';
import {
  AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { ApiService, readableError } from '../api.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './signup.page.html',
})
export class SignupPage {
  readonly submitting = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup(
    {
      username: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(3)],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirm: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    },
    { validators: passwordsMatch },
  );

  constructor(
    private readonly api: ApiService,
    private readonly router: Router,
    readonly route: ActivatedRoute,
  ) {}

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
      await this.api.register(
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