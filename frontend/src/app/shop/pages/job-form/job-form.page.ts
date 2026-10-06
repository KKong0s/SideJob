import { Component, OnDestroy, OnInit, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonLabel,
  IonNote,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonSpinner,
  IonTextarea,
  IonTitle,
  IonToolbar,
  ModalController,
  NavController,
  ToastController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cameraOutline, chevronDown, closeCircle, lockClosedOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { PageStateComponent } from '../../../shared/components/page-state/page-state.component';
import { openGeoPicker } from '../../../shared/components/geo-picker/geo-picker.component';
import { JobInput, OwnJob, ScheduleType, WEEKDAYS, WEEKDAY_SHORT, WageUnit, Weekday } from '../../../shared/models/job.model';
import { GeoService } from '../../../shared/services/geo.service';
import { JobsService } from '../../../shared/services/jobs.service';
import { ShopService } from '../../../shared/services/shop.service';
import { toApiError } from '../../../shared/utils/api-error';
import { dateBetween } from '../../../shared/utils/date-validators';
import { todayIso } from '../../../shared/utils/format';
import { LoadState, errorState } from '../../../shared/utils/paged-list';
import { IMAGE_TYPES, checkUpload } from '../../../shared/utils/upload';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const MAX_JOB_IMAGES = 5;

/** A sample photo: saved on the server (id + path) or, while creating, waiting to be uploaded (file) */
interface PhotoItem {
  id?: number;
  file?: File;
  src: string;
}

/** Create (/shop/jobs/new) or edit (/shop/jobs/:id/edit) a job post */
@Component({
  selector: 'app-job-form',
  templateUrl: 'job-form.page.html',
  styleUrls: ['job-form.page.scss'],
  imports: [
    ReactiveFormsModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonInput,
    IonTextarea,
    IonSelect,
    IonSelectOption,
    IonSegment,
    IonSegmentButton,
    IonChip,
    IonLabel,
    IonIcon,
    IonNote,
    IonButton,
    IonSpinner,
    PageStateComponent,
  ],
})
export class JobFormPage implements OnInit, OnDestroy {
  private readonly shops = inject(ShopService);
  private readonly modals = inject(ModalController);
  private readonly toasts = inject(ToastController);
  private readonly nav = inject(NavController);
  private readonly router = inject(Router);
  readonly geo = inject(GeoService);
  readonly jobs = inject(JobsService);

  /** Route param :id (absent when creating) */
  readonly id = input<string>();
  readonly isEdit = computed(() => !!this.id());

  readonly state = signal<LoadState>('loading');
  readonly locked = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly workDays = signal<Weekday[]>([]);
  readonly workDaysTouched = signal(false);

  readonly weekdays = WEEKDAYS;
  readonly weekdayLabel = WEEKDAY_SHORT;
  readonly today = todayIso();
  readonly minExpiry = todayIso(1);
  readonly maxExpiry = todayIso(60);
  readonly maxWorkDate = todayIso(365);

  // Dates of the job being edited: they stay valid even if already in the past
  private originalStart: string | null = null;
  private originalEnd: string | null = null;

  readonly photos = signal<PhotoItem[]>([]);
  readonly photoBusy = signal(false);
  readonly maxPhotos = MAX_JOB_IMAGES;

  readonly form = inject(FormBuilder).group({
    title: ['', [Validators.required, Validators.maxLength(150)]],
    categoryId: [null as number | null, Validators.required],
    description: ['', [Validators.required, Validators.maxLength(5000)]],
    provinceId: [null as number | null, Validators.required],
    districtId: [null as number | null, Validators.required],
    wage: [null as number | null, [Validators.required, Validators.min(1), Validators.max(100000)]],
    wageUnit: ['hour' as WageUnit, Validators.required],
    scheduleType: ['weekly' as ScheduleType, Validators.required],
    // Work dates: today .. one year ahead (a typed past year is rejected, not only the calendar popup)
    startDate: ['', dateBetween(() => this.today, () => this.maxWorkDate, () => this.originalStart)],
    endDate: [
      '',
      dateBetween(
        () => this.endDateMin(),
        () => this.maxWorkDate,
        () => this.originalEnd,
      ),
    ],
    startTime: ['09:00', [Validators.required, Validators.pattern(TIME)]],
    endTime: ['17:00', [Validators.required, Validators.pattern(TIME)]],
    minAge: [null as number | null, [Validators.min(18), Validators.max(60)]],
    expiresOn: [todayIso(30), dateBetween(() => this.minExpiry, () => this.maxExpiry)],
  });

  readonly scheduleType = signal<ScheduleType>('weekly');

  constructor() {
    addIcons({ cameraOutline, chevronDown, closeCircle, lockClosedOutline });
    // End date's minimum follows the start date
    this.form.controls.startDate.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.endDate.updateValueAndValidity({ emitEvent: false }));
  }

  ngOnInit(): void {
    void this.load();
  }

  /** End date may not be before the start date (form is undefined while it is being built) */
  private endDateMin(): string {
    const start: string | null | undefined = this.form?.controls.startDate.value;
    return start || this.today;
  }

  ngOnDestroy(): void {
    for (const p of this.photos()) if (p.file) URL.revokeObjectURL(p.src);
  }

  async load(): Promise<void> {
    this.state.set('loading');
    try {
      await Promise.all([this.geo.load(), this.jobs.loadCategories()]);
      if (this.isEdit()) {
        this.fill(await this.shops.job(Number(this.id())));
      } else {
        // New jobs default to the shop's own location
        const shop = await this.shops.getProfile();
        this.form.patchValue({ provinceId: shop.provinceId, districtId: shop.districtId });
      }
      this.state.set('ready');
    } catch (err) {
      this.state.set(errorState(err));
    }
  }

  private fill(job: OwnJob): void {
    this.originalStart = job.startDate;
    this.originalEnd = job.endDate;
    this.photos.set((job.images ?? []).map((img) => ({ id: img.id, src: `${environment.uploadsUrl}/${img.path}` })));
    this.form.patchValue({
      title: job.title,
      categoryId: job.category.id,
      description: job.description,
      provinceId: job.provinceId,
      districtId: job.districtId,
      wage: job.wage,
      wageUnit: job.wageUnit,
      scheduleType: job.scheduleType,
      startDate: job.startDate ?? '',
      endDate: job.endDate ?? '',
      startTime: job.startTime,
      endTime: job.endTime,
      minAge: job.minAge,
    });
    this.scheduleType.set(job.scheduleType);
    this.workDays.set(job.scheduleType === 'weekly' ? job.workDays : []);
    this.locked.set(job.locked);
    if (job.locked) {
      for (const name of ['wage', 'wageUnit', 'scheduleType', 'startDate', 'endDate', 'startTime', 'endTime'] as const) {
        this.form.controls[name].disable();
      }
    }
  }

  setScheduleType(type: ScheduleType): void {
    this.form.controls.scheduleType.setValue(type);
    this.scheduleType.set(type);
    // Hidden date fields must not block saving a weekly job
    if (type === 'weekly') this.form.patchValue({ startDate: '', endDate: '' });
  }

  // --- Sample photos (optional, max 5) ---------------------------------------

  async onPhotosSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    input.value = '';
    const room = MAX_JOB_IMAGES - this.photos().length;
    if (files.length > room) await this.toast(`ใส่รูปได้สูงสุด ${MAX_JOB_IMAGES} รูป`, 'warning');
    for (const file of files.slice(0, Math.max(room, 0))) {
      const problem = checkUpload(file, IMAGE_TYPES);
      if (problem) {
        await this.toast(`${file.name}: ${problem}`, 'danger');
        continue;
      }
      if (this.isEdit()) {
        // The job exists: upload right away
        this.photoBusy.set(true);
        try {
          const img = await this.shops.addJobImage(Number(this.id()), file);
          this.photos.update((list) => [...list, { id: img.id, src: `${environment.uploadsUrl}/${img.path}` }]);
        } catch {
          // the interceptor shows the error toast
        } finally {
          this.photoBusy.set(false);
        }
      } else {
        // New job: keep it until the job is created
        this.photos.update((list) => [...list, { file, src: URL.createObjectURL(file) }]);
      }
    }
  }

  async removePhoto(photo: PhotoItem): Promise<void> {
    if (photo.id) {
      try {
        await this.shops.deleteJobImage(Number(this.id()), photo.id);
      } catch {
        return; // the interceptor shows the error toast
      }
    } else {
      URL.revokeObjectURL(photo.src);
    }
    this.photos.update((list) => list.filter((p) => p !== photo));
  }

  /** After creating a job: uploads the waiting photos; returns how many failed */
  private async uploadPending(jobId: number): Promise<number> {
    let failed = 0;
    for (const photo of this.photos()) {
      if (!photo.file) continue;
      try {
        await this.shops.addJobImage(jobId, photo.file);
      } catch {
        failed++;
      }
    }
    return failed;
  }

  toggleDay(day: Weekday): void {
    if (this.locked()) return;
    this.workDaysTouched.set(true);
    this.workDays.update((days) => (days.includes(day) ? days.filter((d) => d !== day) : [...days, day]));
  }

  async chooseProvince(): Promise<void> {
    const control = this.form.controls.provinceId;
    const result = await openGeoPicker(this.modals, { mode: 'province', selected: control.value ? [control.value] : [] });
    control.markAsTouched();
    if (!result || result[0] === control.value) return;
    control.setValue(result[0]);
    this.form.controls.districtId.reset(null);
  }

  async chooseDistrict(): Promise<void> {
    const provinceId = this.form.controls.provinceId.value;
    if (!provinceId) return this.chooseProvince();
    const control = this.form.controls.districtId;
    const result = await openGeoPicker(this.modals, { mode: 'district', provinceId, selected: control.value ? [control.value] : [] });
    control.markAsTouched();
    if (result) control.setValue(result[0]);
  }

  invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  /** Cross-field checks the validators above cannot express */
  private scheduleError(): string {
    const v = this.form.getRawValue();
    if (v.startTime === v.endTime) return 'เวลาเริ่มและเวลาเลิกงานต้องไม่ซ้ำกัน';
    if (v.scheduleType === 'dates') {
      if (!v.startDate || !v.endDate) return 'กรุณาเลือกวันเริ่มและวันสิ้นสุดงาน';
      if (v.endDate < v.startDate) return 'วันสิ้นสุดต้องไม่ก่อนวันเริ่มงาน';
    } else if (this.workDays().length === 0) {
      return 'กรุณาเลือกวันทำงานอย่างน้อย 1 วัน';
    }
    if (!this.isEdit() && (!v.expiresOn || v.expiresOn < this.minExpiry || v.expiresOn > this.maxExpiry)) {
      return 'วันหมดอายุประกาศต้องอยู่ระหว่างพรุ่งนี้ถึง 60 วันข้างหน้า';
    }
    return '';
  }

  async submit(): Promise<void> {
    this.workDaysTouched.set(true);
    this.form.markAllAsTouched();
    const problem = this.form.invalid ? 'กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบและถูกต้อง' : this.scheduleError();
    this.error.set(problem);
    if (problem) return;

    const v = this.form.getRawValue();
    const input: JobInput = {
      title: v.title!.trim(),
      description: v.description!.trim(),
      categoryId: v.categoryId!,
      provinceId: v.provinceId!,
      districtId: v.districtId!,
      wage: Number(v.wage),
      wageUnit: v.wageUnit!,
      scheduleType: v.scheduleType!,
      startDate: v.scheduleType === 'dates' ? v.startDate : null,
      endDate: v.scheduleType === 'dates' ? v.endDate : null,
      workDays: v.scheduleType === 'weekly' ? this.workDays() : [],
      startTime: v.startTime!,
      endTime: v.endTime!,
      minAge: v.minAge ? Number(v.minAge) : null,
    };
    if (!this.isEdit()) input.expiresOn = v.expiresOn!;

    this.busy.set(true);
    try {
      if (this.isEdit()) {
        await this.shops.updateJob(Number(this.id()), input);
        await this.toast('บันทึกการแก้ไขแล้ว');
        this.nav.back();
      } else {
        const job = await this.shops.createJob(input);
        const failed = await this.uploadPending(job.id);
        if (failed) await this.toast(`โพสต์ประกาศแล้ว แต่อัปโหลดรูปไม่สำเร็จ ${failed} รูป เพิ่มได้ในหน้าแก้ไข`, 'warning');
        else await this.toast('โพสต์ประกาศแล้ว');
        await this.router.navigate(['/shop/jobs', job.id], { replaceUrl: true });
      }
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }

  private async toast(message: string, color = 'success'): Promise<void> {
    const t = await this.toasts.create({ message, color, duration: 2500, position: 'top' });
    await t.present();
  }
}
