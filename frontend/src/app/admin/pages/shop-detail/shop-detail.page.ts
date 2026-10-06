import { Component, OnDestroy, computed, inject, input, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import {
  AlertController,
  IonBackButton,
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
  IonSpinner,
  IonTitle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircleOutline, closeCircleOutline, documentTextOutline, openOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { VERIFY_STATUS_COLOR, VERIFY_STATUS_LABEL } from '../../../shared/models/shop.model';
import { thaiDateTime } from '../../../shared/utils/format';
import { Loader } from '../../../shared/utils/loader';
import { AdminService } from '../../admin.service';

@Component({
  selector: 'app-admin-shop-detail',
  templateUrl: 'shop-detail.page.html',
  styles: `
    .doc-frame {
      width: 100%;
      height: 70vh;
      border: 1px solid var(--ion-color-light-shade);
      border-radius: 8px;
    }
    .doc-image {
      max-width: 100%;
      border-radius: 8px;
    }
    .actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      padding: 0 16px 24px;
    }
    .shop-image {
      width: 96px;
      height: 96px;
      object-fit: cover;
      border-radius: 12px;
    }
    .wrap {
      max-width: 960px;
      margin: 0 auto;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonBadge,
    IonButton,
    IonIcon,
    IonNote,
    IonSpinner,
    PageStateComponent,
  ],
})
export class AdminShopDetailPage implements OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);
  private readonly sanitizer = inject(DomSanitizer);

  /** Route param :id */
  readonly id = input.required<string>();
  readonly shopId = computed(() => Number(this.id()));

  readonly shop = new Loader((ctx) => this.admin.shop(this.shopId(), ctx));
  readonly busy = signal(false);

  readonly docLoading = signal(false);
  readonly docUrl = signal<string | null>(null);
  readonly docFrameUrl = signal<SafeResourceUrl | null>(null);

  readonly uploadsUrl = environment.uploadsUrl;
  readonly statusLabel = VERIFY_STATUS_LABEL;
  readonly statusColor = VERIFY_STATUS_COLOR;
  readonly thaiDateTime = thaiDateTime;

  constructor() {
    addIcons({ checkmarkCircleOutline, closeCircleOutline, documentTextOutline, openOutline });
  }

  ionViewWillEnter(): void {
    void this.shop.load();
  }

  ngOnDestroy(): void {
    this.revokeDoc();
  }

  async showDocument(): Promise<void> {
    this.docLoading.set(true);
    try {
      const blob = await this.admin.shopDocument(this.shopId());
      this.revokeDoc();
      const url = URL.createObjectURL(blob);
      this.docUrl.set(url);
      // Object URL created by this page from the admin-only API response
      this.docFrameUrl.set(this.sanitizer.bypassSecurityTrustResourceUrl(url));
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.docLoading.set(false);
    }
  }

  async verify(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'ยืนยันร้านนี้?',
      message: 'ร้านจะโพสต์ประกาศงานได้ทันที และได้รับการแจ้งเตือน',
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'ยืนยันร้าน', handler: () => void this.run(() => this.admin.verifyShop(this.shopId()), 'ยืนยันร้านแล้ว') },
      ],
    });
    await alert.present();
  }

  async reject(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'ปฏิเสธร้านนี้',
      message: 'เหตุผลจะแสดงให้ร้านเห็น และบันทึกใน audit log',
      inputs: [{ name: 'reason', type: 'textarea', placeholder: 'เหตุผล (จำเป็น)', attributes: { maxlength: 500 } }],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'ปฏิเสธ',
          role: 'destructive',
          handler: (data: { reason?: string }) => {
            const reason = (data.reason ?? '').trim();
            if (!reason) {
              void this.toast('กรุณากรอกเหตุผล', 'danger');
              return false; // keep the alert open
            }
            void this.run(() => this.admin.rejectShop(this.shopId(), reason), 'ปฏิเสธร้านแล้ว');
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async run(action: () => Promise<void>, done: string): Promise<void> {
    this.busy.set(true);
    try {
      await action();
      await this.toast(done, 'success');
      await this.shop.load();
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.busy.set(false);
    }
  }

  private revokeDoc(): void {
    const url = this.docUrl();
    if (url) URL.revokeObjectURL(url);
    this.docUrl.set(null);
    this.docFrameUrl.set(null);
  }

  private async toast(message: string, color: string): Promise<void> {
    const t = await this.toasts.create({ message, color, duration: 2500, position: 'top' });
    await t.present();
  }
}
