import { Component, computed, effect, inject, signal, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, IonNote, IonSpinner } from '@ionic/angular';

import { BrandLogoComponent } from '../../components/brand-logo/brand-logo.component';
import { GoogleAuthComponent } from '../../components/google-auth/google-auth.component';
import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { toApiError } from '../../utils/api-error';
import { hideSplash, showSplash } from '../../utils/splash';

type Step = 'email' | 'password';

/** Two-step sign in: email first, then password (the email stays in a hidden field for password managers) */
@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonNote, IonSpinner, GoogleAuthComponent, BrandLogoComponent],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly step = signal<Step>('email');
  readonly busy = signal(false);
  readonly error = signal('');

  private readonly emailValue = toSignal(this.form.controls.email.valueChanges, { initialValue: '' });
  readonly initial = computed(() => this.emailValue().trim().charAt(0).toUpperCase() || '?');

  private readonly emailInput = viewChild<IonInput>('emailInput');
  private readonly passwordInput = viewChild<IonInput>('passwordInput');

  constructor() {
    // Move the cursor into the field of the current step
    effect(() => {
      const input = this.step() === 'email' ? this.emailInput() : this.passwordInput();
      if (input) setTimeout(() => void input.setFocus(), 150);
    });
  }

  async submit(): Promise<void> {
    if (this.step() === 'email') {
      const email = this.form.controls.email;
      if (email.invalid) {
        email.markAsTouched();
        return;
      }
      this.error.set('');
      this.step.set('password');
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.goHome(await this.auth.login(email.trim(), password));
    } catch (err) {
      this.error.set(toApiError(err).message);
      // Clear the wrong password and put the cursor back for another try
      this.form.controls.password.reset();
      setTimeout(() => void this.passwordInput()?.setFocus(), 0);
    } finally {
      this.busy.set(false);
    }
  }

  back(): void {
    this.form.controls.password.reset();
    this.error.set('');
    this.step.set('email');
  }

  async goHome(user: SessionUser): Promise<void> {
    // The runner splash covers the hand-over from login to the user's home page
    showSplash();
    try {
      this.form.reset();
      this.step.set('email');
      await this.router.navigateByUrl(this.auth.homeUrl(user), { replaceUrl: true });
    } finally {
      void hideSplash();
    }
  }
}
