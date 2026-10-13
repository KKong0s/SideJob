import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonAvatar,
  IonButton,
  IonChip,
  IonIcon,
  IonInput,
  IonLabel,
  IonNote,
  IonSpinner,
  IonTextarea,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, closeCircle, personCircleOutline } from 'ionicons/icons';

import { environment } from '../../../../environments/environment';
import { openAreaPicker } from '../../components/area-picker/area-picker.component';
import { SeekerProfile } from '../../models/search.model';
import { SessionUser } from '../../models/session.model';
import { AreaService } from '../../services/area.service';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';
import { toApiError } from '../../utils/api-error';
import { minAge, normalisePhone, thaiPhone, yearsAgo } from './profile-validators';
import { PickImageDirective } from '../../directives/pick-image.directive';

const MIN_AGE = 18;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface Area {
  provinceId: number;
  districtId: number | null;
}

/**
 * Seeker profile form, used in onboarding and (mode="edit", pre-filled from `initial`) on the profile page.
 * Both save through PUT /api/auth/onboarding/profile, which replaces the profile and areas.
 */
@Component({
  selector: 'app-seeker-profile-form',
  templateUrl: 'seeker-profile-form.component.html',
  styleUrls: ['profile-form.scss'],
  imports: [
    PickImageDirective,
    ReactiveFormsModule,
    IonAvatar,
    IonButton,
    IonChip,
    IonIcon,
    IonInput,
    IonLabel,
    IonNote,
    IonSpinner,
    IonTextarea,
  ],
})
export class SeekerProfileFormComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly modals = inject(ModalController);
  private readonly area = inject(AreaService);
  readonly geo = inject(GeoService);

  readonly mode = input<'onboarding' | 'edit'>('onboarding');
  readonly initial = input<SeekerProfile | null>(null);

  readonly saved = output<SessionUser>();

  readonly maxBirthDate = yearsAgo(MIN_AGE);

  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    birthDate: ['', [Validators.required, minAge(MIN_AGE)]],
    phone: ['', [Validators.required, thaiPhone]],
    skills: ['', Validators.maxLength(500)],
    bio: ['', Validators.maxLength(1000)],
  });

  readonly areas = signal<Area[]>([]);
  readonly areasTouched = signal(false);

  readonly avatarFile = signal<File | null>(null);
  readonly avatarPreview = signal<string | null>(null);
  readonly avatarError = signal('');

  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    addIcons({ addOutline, closeCircle, personCircleOutline });
  }

  ngOnInit(): void {
    const p = this.initial();
    if (!p) return;
    this.form.patchValue({
      fullName: p.fullName,
      birthDate: p.birthDate,
      phone: p.phone ?? '',
      skills: p.skills ?? '',
      bio: p.bio ?? '',
    });
    this.areas.set(p.areas.map((a) => ({ provinceId: a.provinceId, districtId: a.districtId })));
    if (p.avatarPath) this.avatarPreview.set(`${environment.uploadsUrl}/${p.avatarPath}`);
  }

  /** Region -> province -> district picker; a province picked again replaces what was chosen for it */
  async addAreas(): Promise<void> {
    await this.geo.load();
    const result = await openAreaPicker(this.modals, {
      allowWholeCountry: false,
      counts: await this.area.loadCounts(),
      confirmText: 'เพิ่มพื้นที่นี้',
    });
    if (!result?.provinceId) return;
    const provinceId = result.provinceId;
    const added: Area[] = result.districtIds.length
      ? result.districtIds.map((districtId) => ({ provinceId, districtId }))
      : [{ provinceId, districtId: null }];
    this.areas.update((list) => [...list.filter((a) => a.provinceId !== provinceId), ...added]);
    this.areasTouched.set(true);
  }

  removeArea(area: Area): void {
    this.areas.update((list) => list.filter((a) => a !== area));
    this.areasTouched.set(true);
  }

  areaLabel(area: Area): string {
    const province = this.geo.provinceName(area.provinceId);
    if (area.districtId === null) return `${province} (ทั้งจังหวัด)`;
    return `${this.geo.districtLabel(area.provinceId)}${this.geo.districtName(area.districtId)}, ${province}`;
  }

  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    this.avatarError.set('');
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.avatarError.set('รองรับเฉพาะไฟล์ JPG หรือ PNG');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      this.avatarError.set('ไฟล์ต้องมีขนาดไม่เกิน 5 MB');
      return;
    }
    const old = this.avatarPreview();
    if (old?.startsWith('blob:')) URL.revokeObjectURL(old);
    this.avatarFile.set(file);
    this.avatarPreview.set(URL.createObjectURL(file));
  }

  async submit(): Promise<void> {
    this.areasTouched.set(true);
    if (this.form.invalid || this.areas().length === 0) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      let user = await this.auth.saveProfile({
        fullName: v.fullName.trim(),
        birthDate: v.birthDate,
        phone: normalisePhone(v.phone),
        skills: v.skills.trim() || undefined,
        bio: v.bio.trim() || undefined,
        areas: this.areas(),
      });
      const avatar = this.avatarFile();
      if (avatar) {
        // The profile is already saved; a failed upload only shows a toast and can be retried later
        user = await this.auth.uploadAvatar(avatar).catch(() => user);
        this.avatarFile.set(null);
      }
      this.saved.emit(user);
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
