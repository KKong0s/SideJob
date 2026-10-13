import { Component, inject, signal } from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonNote,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  alertCircleOutline,
  cameraOutline,
  checkmarkCircle,
  cloudUploadOutline,
  createOutline,
  documentTextOutline,
  hourglassOutline,
  storefrontOutline,
} from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { BellButtonComponent } from '../../../shared/components/bell-button/bell-button.component';
import { LogoutButtonComponent } from '../../../shared/components/logout-button/logout-button.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { ReviewListComponent } from '../../../shared/components/review-list/review-list.component';
import { StarsComponent } from '../../../shared/components/stars/stars.component';
import { ReviewService } from '../../../shared/services/review.service';
import { Shop, VERIFY_STATUS_COLOR, VERIFY_STATUS_LABEL } from '../../../shared/models/shop.model';
import { ShopProfileFormComponent } from '../../../shared/pages/onboarding/shop-profile-form.component';
import { AuthService } from '../../../shared/services/auth.service';
import { GeoService } from '../../../shared/services/geo.service';
import { ShopService } from '../../../shared/services/shop.service';
import { thaiDateTime } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';
import { DOCUMENT_TYPES, IMAGE_TYPES, checkUpload, takeFile } from '../../../shared/utils/upload';
import { PickImageDirective } from '../../../shared/directives/pick-image.directive';

@Component({
  selector: 'app-shop-profile',
  templateUrl: 'shop-profile.page.html',
  styleUrls: ['shop-profile.page.scss'],
  imports: [
    PickImageDirective,
    BellButtonComponent,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonBadge,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonLabel,
    IonNote,
    IonSpinner,
    LogoutButtonComponent,
    PageStateComponent,
    ShopProfileFormComponent,
    ReviewListComponent,
    StarsComponent,
  ],
})
export class ShopProfilePage {
  private readonly shops = inject(ShopService);
  private readonly auth = inject(AuthService);
  private readonly toasts = inject(ToastController);
  private readonly geo = inject(GeoService);
  private readonly reviews = inject(ReviewService);
  readonly fetchReviews = (page: number, ctx?: Parameters<ReviewService['myShopReviews']>[1]) => this.reviews.myShopReviews(page, ctx);

  readonly shop = new Loader((ctx) => this.shops.getProfile(ctx));
  readonly editing = signal(false);
  readonly uploadingImage = signal(false);
  readonly uploadingDoc = signal(false);

  readonly uploadsUrl = environment.uploadsUrl;
  readonly statusLabel = VERIFY_STATUS_LABEL;
  readonly statusColor = VERIFY_STATUS_COLOR;
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    addIcons({
      alertCircleOutline,
      cameraOutline,
      checkmarkCircle,
      cloudUploadOutline,
      createOutline,
      documentTextOutline,
      hourglassOutline,
      storefrontOutline,
    });
    void this.shop.load();
  }

  async startEdit(): Promise<void> {
    // The edit form shows province / district names from the cached geo data
    await this.geo.load();
    this.editing.set(true);
  }

  async onUpdated(shop: Shop): Promise<void> {
    this.shop.set(shop);
    this.editing.set(false);
    await this.toast('บันทึกข้อมูลร้านแล้ว', 'success');
    await this.auth.refresh();
  }

  async onImageSelected(event: Event): Promise<void> {
    const file = takeFile(event);
    if (!file) return;
    const problem = checkUpload(file, IMAGE_TYPES);
    if (problem) return void this.toast(problem, 'danger');
    this.uploadingImage.set(true);
    try {
      const imagePath = await this.shops.uploadImage(file, file.name);
      const current = this.shop.value();
      if (current) this.shop.set({ ...current, imagePath });
      await this.toast('เปลี่ยนรูปร้านแล้ว', 'success');
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.uploadingImage.set(false);
    }
  }

  async onDocumentSelected(event: Event): Promise<void> {
    const file = takeFile(event);
    if (!file) return;
    const problem = checkUpload(file, DOCUMENT_TYPES);
    if (problem) return void this.toast(problem, 'danger');
    this.uploadingDoc.set(true);
    try {
      await this.shops.uploadVerification(file, file.name);
      await this.shop.load();
      await this.auth.refresh();
      await this.toast('ส่งเอกสารแล้ว รอแอดมินตรวจสอบ', 'success');
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.uploadingDoc.set(false);
    }
  }

  private async toast(message: string, color: string): Promise<void> {
    const t = await this.toasts.create({ message, color, duration: 2500, position: 'top' });
    await t.present();
  }
}
