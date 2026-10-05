import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, IonNote, IonSpinner } from '@ionic/angular';

import { GoogleAuthComponent } from '../../components/google-auth/google-auth.component';
import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { toApiError } from '../../utils/api-error';

@Component({
  selector: 'app-login',
  templateUrl: 'login.page.html',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonNote, IonSpinner, GoogleAuthComponent],
})
export class LoginPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  readonly busy = signal(false);
  readonly error = signal('');

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const { email, password } = this.form.getRawValue();
      await this.goHome(await this.auth.login(email, password));
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async goHome(user: SessionUser): Promise<void> {
    this.form.reset();
    await this.router.navigateByUrl(this.auth.homeUrl(user), { replaceUrl: true });
  }
}
