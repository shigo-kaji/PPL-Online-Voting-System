import { Component, OnInit, signal, inject } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ApiService, readableError } from '../api.service';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('newPassword')?.value as string;
  const confirm = group.get('confirmPassword')?.value as string;
  return !password && !confirm || password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-account-page',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './account.page.html',
})
export class AccountPage implements OnInit {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly submitting = signal(false);
  readonly saved = signal(false);
  readonly error = signal('');
  readonly form = new FormGroup(
    {
      username: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.minLength(3)] }),
      currentPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
      newPassword: new FormControl('', { nonNullable: true, validators: [Validators.minLength(8)] }),
      confirmPassword: new FormControl('', { nonNullable: true }),
    },
    { validators: passwordsMatch },
  );

  async ngOnInit(): Promise<void> {
    try {
      await this.api.refreshSession();
    } catch {
      await this.router.navigate(['/login'], { queryParams: { returnUrl: '/account' } });
      return;
    }
    if (!this.api.currentUser()?.authenticated) {
      await this.router.navigate(['/login'], { queryParams: { returnUrl: '/account' } });
      return;
    }
    this.form.controls.username.setValue(this.api.currentUser()?.username ?? '');
  }

  async submit(): Promise<void> {
    this.error.set('');
    this.saved.set(false);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    try {
      await this.api.updateAccount(
        this.form.controls.username.value.trim(),
        this.form.controls.currentPassword.value,
        this.form.controls.newPassword.value,
      );
      this.form.controls.currentPassword.reset();
      this.form.controls.newPassword.reset();
      this.form.controls.confirmPassword.reset();
      this.saved.set(true);
    } catch (error) {
      this.error.set(readableError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async signOut(): Promise<void> {
    await this.api.logout();
    await this.router.navigateByUrl('/');
  }
}
