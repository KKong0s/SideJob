import { AfterViewInit, Component, ElementRef, inject, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonButton, IonInput, IonInputPasswordToggle, IonNote, IonSpinner, IonText } from '@ionic/angular';

import { environment } from '../../../../environments/environment';
import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { toApiError } from '../../utils/api-error';

// Google Identity Services global (loaded at runtime)
declare const google: {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (res: { credential: string }) => void; ux_mode?: string }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
};

let gisScript: Promise<void> | null = null;

function loadGis(): Promise<void> {
  gisScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisScript = null;
      reject(new Error('Failed to load Google Identity Services'));
    };
    document.head.appendChild(script);
  });
  return gisScript;
}

/**
 * "Continue with Google" button (web). Sends the ID token to the API and, when the email already
 * belongs to a password account, asks for that password to link the two.
 * Renders nothing when environment.googleClientId is empty.
 */
@Component({
  selector: 'app-google-auth',
  templateUrl: 'google-auth.component.html',
  styleUrls: ['google-auth.component.scss'],
  imports: [FormsModule, IonButton, IonInput, IonInputPasswordToggle, IonNote, IonSpinner, IonText],
})
export class GoogleAuthComponent implements AfterViewInit {
  private readonly auth = inject(AuthService);

  readonly signedIn = output<SessionUser>();

  readonly enabled = !!environment.googleClientId;
  readonly buttonHost = viewChild<ElementRef<HTMLDivElement>>('buttonHost');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly link = signal<{ linkToken: string; email: string } | null>(null);
  linkPassword = '';

  async ngAfterViewInit(): Promise<void> {
    const host = this.buttonHost()?.nativeElement;
    if (!this.enabled || !host) return;
    try {
      await loadGis();
      google.accounts.id.initialize({
        client_id: environment.googleClientId,
        callback: (res) => void this.onCredential(res.credential),
        ux_mode: 'popup',
      });
      google.accounts.id.renderButton(host, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        locale: 'th',
        width: Math.min(host.clientWidth || 320, 400),
      });
    } catch {
      this.error.set('โหลดปุ่ม Google ไม่สำเร็จ');
    }
  }

  private async onCredential(idToken: string): Promise<void> {
    this.error.set('');
    this.busy.set(true);
    try {
      this.signedIn.emit(await this.auth.loginWithGoogle(idToken));
    } catch (err) {
      const e = toApiError(err);
      if (e.code === 'GOOGLE_LINK_REQUIRED' && e.details) {
        this.link.set({ linkToken: String(e.details['linkToken']), email: String(e.details['email']) });
      } else {
        this.error.set(e.message);
      }
    } finally {
      this.busy.set(false);
    }
  }

  async confirmLink(): Promise<void> {
    const link = this.link();
    if (!link || !this.linkPassword) return;
    this.error.set('');
    this.busy.set(true);
    try {
      const user = await this.auth.linkGoogle(link.linkToken, this.linkPassword);
      this.link.set(null);
      this.signedIn.emit(user);
    } catch (err) {
      const e = toApiError(err);
      if (e.code === 'LINK_TOKEN_INVALID') this.link.set(null);
      this.error.set(e.message);
    } finally {
      this.linkPassword = '';
      this.busy.set(false);
    }
  }

  cancelLink(): void {
    this.link.set(null);
    this.linkPassword = '';
  }
}
