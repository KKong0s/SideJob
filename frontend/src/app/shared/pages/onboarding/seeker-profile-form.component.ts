import { Component, computed, inject, output, signal } from '@angular/core';
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
import { addOutline, chevronDown, closeCircle, personCircleOutline } from 'ionicons/icons';

import { WHOLE_PROVINCE, openGeoPicker } from '../../components/geo-picker/geo-picker.component';

import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';
import { toApiError } from '../../utils/api-error';
import { LINE_ID_PATTERN, minAge, normalisePhone, thaiPhone, yearsAgo } from './profile-validators';

const MIN_AGE = 18;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

interface Area {
  provinceId: number;
  districtId: number | null;
}

@Component({
  selector: 'app-seeker-profile-form',
  templateUrl: 'seeker-profile-form.component.html',
  styleUrls: ['profile-form.scss'],
  imports: [
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
export class SeekerProfileFormComponent {
  private readonly auth = inject(AuthService);
  private readonly modals = inject(ModalController);
  readonly geo = inject(GeoService);

  readonly saved = output<SessionUser>();

  readonly maxBirthDate = yearsAgo(MIN_AGE);

  readonly form = inject(FormBuilder).nonNullable.group({
    fullName: ['', [Validators.required, Validators.maxLength(150)]],
    birthDate: ['', [Validators.required, minAge(MIN_AGE)]],
    phone: ['', [Validators.required, thaiPhone]],
    lineId: ['', Validators.pattern(LINE_ID_PATTERN)],
    skills: ['', Validators.maxLength(500)],
    bio: ['', Validators.maxLength(1000)],
  });

  // Area picker (a full region -> province -> district modal comes in Phase 4)
  readonly areas = signal<Area[]>([]);
  readonly pickProvince = signal<number | null>(null);
  readonly pickDistricts = signal<number[]>([]);
  readonly areasTouched = signal(false);

  readonly pickProvinceLabel = computed(() => {
    const id = this.pickProvince();
    return id ? this.geo.provinceName(id) : '';
  });
  readonly pickDistrictsLabel = computed(() => {
    const ids = this.pickDistricts().filter((id) => id !== WHOLE_PROVINCE);
    return ids.length ? ids.map((id) => this.geo.districtName(id)).join(', ') : 'ทั้งจังหวัด';
  });

  readonly avatarFile = signal<File | null>(null);
  readonly avatarPreview = signal<string | null>(null);
  readonly avatarError = signal('');

  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    addIcons({ addOutline, chevronDown, closeCircle, personCircleOutline });
  }

  async chooseProvince(): Promise<void> {
    const current = this.pickProvince();
    const result = await openGeoPicker(this.modals, { mode: 'province', selected: current ? [current] : [] });
    if (!result || result[0] === current) return;
    this.pickProvince.set(result[0]);
    this.pickDistricts.set([]);
  }

  async chooseDistricts(): Promise<void> {
    const result = await openGeoPicker(this.modals, {
      mode: 'district',
      provinceId: this.pickProvince(),
      multiple: true,
      selected: this.pickDistricts(),
    });
    if (result) this.pickDistricts.set(result);
  }

  /** Adding a province again replaces what was chosen for it before. */
  addArea(): void {
    const provinceId = this.pickProvince();
    if (!provinceId) return;
    const districts = this.pickDistricts();
    const added: Area[] =
      districts.length === 0 || districts.includes(WHOLE_PROVINCE)
        ? [{ provinceId, districtId: null }]
        : districts.map((districtId) => ({ provinceId, districtId }));

    this.areas.update((list) => [...list.filter((a) => a.provinceId !== provinceId), ...added]);
    this.pickProvince.set(null);
    this.pickDistricts.set([]);
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
    if (old) URL.revokeObjectURL(old);
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
        lineId: v.lineId.trim() || undefined,
        skills: v.skills.trim() || undefined,
        bio: v.bio.trim() || undefined,
        areas: this.areas(),
      });
      const avatar = this.avatarFile();
      if (avatar) {
        // The profile is already saved; a failed upload only shows a toast and can be retried later
        user = await this.auth.uploadAvatar(avatar).catch(() => user);
      }
      this.saved.emit(user);
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
