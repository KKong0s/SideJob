import { Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  IonBackButton,
  IonBadge,
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonSpinner,
  IonTitle,
  IonToolbar,
  AlertController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { bookmark, bookmarkOutline, calendarOutline, cashOutline, flagOutline, locationOutline, personOutline, timeOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { JobGalleryComponent } from '../../../shared/components/job-gallery/job-gallery.component';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { openReportDialog } from '../../../shared/components/report-dialog';
import { StarsComponent } from '../../../shared/components/stars/stars.component';
import { daysText, locationText, timeText, wageText } from '../../../shared/models/job.model';
import { JobStatusForSeeker, PublicJob } from '../../../shared/models/search.model';
import { JobsService } from '../../../shared/services/jobs.service';
import { ReviewService } from '../../../shared/services/review.service';
import { SeekerService } from '../../../shared/services/seeker.service';
import { silentErrors } from '../../../shared/utils/api-error';
import { thaiDate, timeAgo } from '../../../shared/utils/format';
import { registerCategoryIcons } from '../../../shared/utils/icons';
import { Loader } from '../../../shared/utils/loader';

@Component({
  selector: 'app-job-detail',
  templateUrl: 'job-detail.page.html',
  styleUrls: ['job-detail.page.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonButton,
    IonIcon,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    IonBadge,
    IonCard,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonFooter,
    IonSpinner,
    RouterLink,
    JobGalleryComponent,
    PageStateComponent,
    StarsComponent,
  ],
})
export class JobDetailPage {
  private readonly jobsApi = inject(JobsService);
  private readonly seeker = inject(SeekerService);
  private readonly toasts = inject(ToastController);
  private readonly alerts = inject(AlertController);
  private readonly router = inject(Router);
  private readonly reviews = inject(ReviewService);

  readonly id = input.required<string>();
  readonly jobId = computed(() => Number(this.id()));
  readonly job = new Loader((ctx) => this.jobsApi.job(this.jobId(), ctx));
  readonly status = signal<JobStatusForSeeker | null>(null);
  readonly savingBookmark = signal(false);
  readonly applying = signal(false);

  /** What the bottom bar shows: apply button, current application, or closed */
  readonly applyState = computed(() => {
    const job = this.job.value();
    const app = this.status()?.application;
    if (app && app.status !== 'cancelled') return app.status as 'pending' | 'accepted' | 'rejected' | 'completed';
    return job?.acceptingApplications ? 'can-apply' : 'closed';
  });

  readonly uploadsUrl = environment.uploadsUrl;
  readonly wageText = wageText;
  readonly locationText = locationText;
  readonly daysText = daysText;
  readonly timeText = timeText;
  readonly thaiDate = thaiDate;
  readonly timeAgo = timeAgo;

  constructor() {
    addIcons({ bookmark, bookmarkOutline, calendarOutline, cashOutline, flagOutline, locationOutline, personOutline, timeOutline });
    registerCategoryIcons();
  }

  ionViewWillEnter(): void {
    void this.load();
  }

  async load(): Promise<void> {
    await Promise.all([this.job.load(), this.loadStatus()]);
  }

  async refresh(event: CustomEvent): Promise<void> {
    await this.load();
    await (event.target as HTMLIonRefresherElement).complete();
  }

  private async loadStatus(): Promise<void> {
    try {
      this.status.set(await this.seeker.jobStatus(this.jobId(), silentErrors()));
    } catch {
      this.status.set(null);
    }
  }

  async toggleSave(): Promise<void> {
    const current = this.status();
    if (!current || this.savingBookmark()) return;
    this.savingBookmark.set(true);
    try {
      if (current.saved) await this.seeker.unsave(this.jobId());
      else await this.seeker.save(this.jobId());
      this.status.set({ ...current, saved: !current.saved });
      await this.toast(current.saved ? 'นำออกจากงานที่บันทึกแล้ว' : 'บันทึกงานแล้ว');
    } catch {
      // the interceptor shows the error toast
    } finally {
      this.savingBookmark.set(false);
    }
  }

  async apply(): Promise<void> {
    const job = this.job.value();
    if (!job) return;
    const alert = await this.alerts.create({
      header: 'สมัครงานนี้?',
      message: `ร้าน ${job.shop.name} จะเห็นชื่อ อายุ ทักษะ และแนะนำตัวของคุณ ส่วนเบอร์โทรและ LINE จะเปิดให้ร้านเห็นหลังรับคุณเข้าทำงาน`,
      buttons: [
        { text: 'ยกเลิก', role: 'cancel' },
        { text: 'สมัครเลย', handler: () => void this.sendApplication() },
      ],
    });
    await alert.present();
  }

  private async sendApplication(): Promise<void> {
    this.applying.set(true);
    try {
      await this.seeker.apply(this.jobId());
      await this.loadStatus();
      await this.toast('ส่งใบสมัครแล้ว รอร้านพิจารณา');
    } catch {
      // the interceptor shows the error toast (closed job, age requirement, ...)
    } finally {
      this.applying.set(false);
    }
  }

  openApplication(): void {
    const app = this.status()?.application;
    if (app) void this.router.navigate(['/seeker/applications', app.id]);
  }

  report(): void {
    void openReportDialog(this.alerts, this.toasts, this.reviews, 'job', this.jobId(), 'รายงานประกาศนี้');
  }

  shopLocation(job: PublicJob): string {
    const s = job.shop;
    if (!s.provinceName) return '';
    return s.provinceId === 1 ? `เขต${s.districtName}, กรุงเทพฯ` : `${s.districtName}, ${s.provinceName}`;
  }

  private async toast(message: string, color = 'success'): Promise<void> {
    const t = await this.toasts.create({ message, color, duration: 2000, position: 'top' });
    await t.present();
  }
}
