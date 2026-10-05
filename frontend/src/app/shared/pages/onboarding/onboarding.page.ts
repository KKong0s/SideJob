import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonNote,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { briefcaseOutline, storefrontOutline } from 'ionicons/icons';

import { LogoutButtonComponent } from '../../components/logout-button/logout-button.component';
import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';
import { toApiError } from '../../utils/api-error';
import { SeekerProfileFormComponent } from './seeker-profile-form.component';
import { ShopProfileFormComponent } from './shop-profile-form.component';

const STEP_NUMBER = { role: 1, profile: 2, terms: 3, done: 3 } as const;

/** Onboarding: choose role -> fill in profile -> accept terms & PDPA. The step comes from the API. */
@Component({
  selector: 'app-onboarding',
  templateUrl: 'onboarding.page.html',
  styleUrls: ['onboarding.page.scss'],
  imports: [
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonProgressBar,
    IonCard,
    IonCardContent,
    IonIcon,
    IonButton,
    IonCheckbox,
    IonNote,
    IonSpinner,
    LogoutButtonComponent,
    SeekerProfileFormComponent,
    ShopProfileFormComponent,
  ],
})
export class OnboardingPage {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly alerts = inject(AlertController);
  private readonly geo = inject(GeoService);

  readonly user = this.auth.user;
  readonly step = computed(() => this.user()?.onboardingStep ?? 'role');
  readonly stepNumber = computed(() => STEP_NUMBER[this.step()]);

  readonly geoReady = signal(false);
  readonly geoError = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  acceptTerms = false;
  acceptPdpa = false;

  constructor() {
    addIcons({ briefcaseOutline, storefrontOutline });
    void this.loadGeo();
  }

  async loadGeo(): Promise<void> {
    this.geoError.set(false);
    try {
      await this.geo.load();
      this.geoReady.set(true);
    } catch {
      this.geoError.set(true);
    }
  }

  async chooseRole(role: 'seeker' | 'shop'): Promise<void> {
    const label = role === 'seeker' ? 'ผู้หางาน' : 'ร้านค้า / ผู้จ้างงาน';
    const alert = await this.alerts.create({
      header: `ใช้งานในฐานะ${label}?`,
      message: 'เลือกแล้วจะเปลี่ยนบทบาทภายหลังไม่ได้',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ยืนยัน', handler: () => void this.saveRole(role) },
      ],
    });
    await alert.present();
  }

  private async saveRole(role: 'seeker' | 'shop'): Promise<void> {
    this.busy.set(true);
    try {
      await this.auth.chooseRole(role);
    } catch {
      // Error toast comes from the interceptor; reload state in case the role was already set
      await this.auth.refresh().catch(() => undefined);
    } finally {
      this.busy.set(false);
    }
  }

  async submitTerms(): Promise<void> {
    if (!this.acceptTerms || !this.acceptPdpa) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.finish(await this.auth.acceptTerms());
    } catch (err) {
      this.error.set(toApiError(err).message);
      await this.auth.refresh().catch(() => undefined);
    } finally {
      this.busy.set(false);
    }
  }

  async finish(user: SessionUser): Promise<void> {
    if (user.onboardingStep === 'done') {
      await this.router.navigateByUrl(this.auth.homeUrl(user), { replaceUrl: true });
    }
  }
}
