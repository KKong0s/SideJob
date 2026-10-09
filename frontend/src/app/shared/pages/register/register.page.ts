import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonInput, IonInputPasswordToggle, IonNote, IonSpinner } from '@ionic/angular';

import { BrandLogoComponent } from '../../components/brand-logo/brand-logo.component';
import { GoogleAuthComponent } from '../../components/google-auth/google-auth.component';
import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { toApiError } from '../../utils/api-error';

// Same rule as the API: 8+ characters with letters and digits
export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/;

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const { password, confirm } = group.value as { password: string; confirm: string };
  return password === confirm ? null : { mismatch: true };
}

@Component({
  selector: 'app-register',
  templateUrl: 'register.page.html',
  imports: [ReactiveFormsModule, RouterLink, IonContent, IonInput, IonInputPasswordToggle, IonButton, IonNote, IonSpinner, GoogleAuthComponent, BrandLogoComponent],
})
export class RegisterPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly form = inject(FormBuilder).nonNullable.group(
    {
      email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
      password: ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
      confirm: ['', Validators.required],
    },
    { validators: passwordsMatch },
  );
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
      await this.goNext(await this.auth.register(email, password));
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  async goNext(user: SessionUser): Promise<void> {
    this.form.reset();
    await this.router.navigateByUrl(this.auth.homeUrl(user), { replaceUrl: true });
  }
}
