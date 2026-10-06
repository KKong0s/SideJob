import { Component, inject } from '@angular/core';
import {
  AlertController,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonMenuButton,
  IonNote,
  IonTitle,
  IonToggle,
  IonToolbar,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { add, createOutline, pricetagsOutline } from 'ionicons/icons';

import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { JobsService } from '../../../shared/services/jobs.service';
import { registerCategoryIcons } from '../../../shared/utils/icons';
import { Loader } from '../../../shared/utils/loader';
import { AdminCategory } from '../../admin.model';
import { AdminService } from '../../admin.service';

/** Job categories: add, rename, reorder, (de)activate. No delete because jobs reference them. */
@Component({
  selector: 'app-admin-categories',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start"><ion-menu-button></ion-menu-button></ion-buttons>
        <ion-title>หมวดหมู่</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="edit(null)"><ion-icon slot="start" name="add"></ion-icon>เพิ่มหมวดหมู่</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <app-page-state [state]="categories.state()" emptyIcon="pricetags-outline" emptyText="ยังไม่มีหมวดหมู่" (retry)="categories.load()">
        <ion-list class="wrap">
          @for (c of categories.value() ?? []; track c.id) {
            <ion-item>
              <ion-icon slot="start" [name]="c.icon || 'pricetags-outline'" aria-hidden="true"></ion-icon>
              <ion-label>
                <h3>{{ c.name }}</h3>
                <p>ลำดับ {{ c.sortOrder }} · {{ c.jobCount }} ประกาศ · ไอคอน {{ c.icon || '-' }}</p>
              </ion-label>
              <ion-toggle slot="end" [checked]="c.isActive" (ionChange)="toggle(c, $event.detail.checked)" [attr.aria-label]="'เปิดใช้ ' + c.name"></ion-toggle>
              <ion-button slot="end" fill="clear" (click)="edit(c)" aria-label="แก้ไข"><ion-icon slot="icon-only" name="create-outline"></ion-icon></ion-button>
            </ion-item>
          }
        </ion-list>
        <ion-note class="ion-padding block">หมวดหมู่ที่ปิดใช้งานจะไม่แสดงให้ร้านเลือกตอนโพสต์งาน แต่ประกาศเดิมยังอยู่ ชื่อไอคอนใช้ชื่อจาก ionicons เช่น cafe-outline</ion-note>
      </app-page-state>
    </ion-content>
  `,
  styles: `
    .wrap {
      max-width: 760px;
    }
    .block {
      display: block;
    }
  `,
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonMenuButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonNote,
    PageStateComponent,
  ],
})
export class AdminCategoriesPage {
  private readonly admin = inject(AdminService);
  private readonly jobs = inject(JobsService);
  private readonly alerts = inject(AlertController);
  private readonly toasts = inject(ToastController);

  readonly categories = new Loader((ctx) => this.admin.categories(ctx));

  constructor() {
    addIcons({ add, createOutline, pricetagsOutline });
    registerCategoryIcons();
    void this.categories.load();
  }

  async toggle(c: AdminCategory, isActive: boolean): Promise<void> {
    await this.save({ ...c, isActive });
  }

  async edit(c: AdminCategory | null): Promise<void> {
    const alert = await this.alerts.create({
      header: c ? 'แก้ไขหมวดหมู่' : 'เพิ่มหมวดหมู่',
      inputs: [
        { name: 'name', type: 'text', placeholder: 'ชื่อหมวดหมู่', value: c?.name ?? '', attributes: { maxlength: 100 } },
        { name: 'icon', type: 'text', placeholder: 'ไอคอน เช่น cafe-outline', value: c?.icon ?? '' },
        { name: 'sortOrder', type: 'number', placeholder: 'ลำดับ (น้อยขึ้นก่อน)', value: c?.sortOrder ?? 100 },
      ],
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        {
          text: 'บันทึก',
          handler: (data: { name: string; icon: string; sortOrder: string }) => {
            if (!data.name.trim()) return false;
            void this.save({
              id: c?.id,
              name: data.name.trim(),
              icon: data.icon.trim() || null,
              sortOrder: Number.parseInt(data.sortOrder, 10) || 0,
              isActive: c?.isActive ?? true,
            });
            return true;
          },
        },
      ],
    });
    await alert.present();
  }

  private async save(c: Omit<AdminCategory, 'id' | 'jobCount'> & { id?: number }): Promise<void> {
    try {
      await this.admin.saveCategory(c);
      await this.categories.load();
      // Shops see the change next time the category list is loaded
      this.jobs.categories.set([]);
      const t = await this.toasts.create({ message: 'บันทึกหมวดหมู่แล้ว', color: 'success', duration: 2000, position: 'top' });
      await t.present();
    } catch {
      await this.categories.load(); // undo the toggle on screen
    }
  }
}
