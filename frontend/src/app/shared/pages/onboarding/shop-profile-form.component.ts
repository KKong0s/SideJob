import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonIcon, IonInput, IonNote, IonSpinner, IonTextarea, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown } from 'ionicons/icons';

import { openGeoPicker } from '../../components/geo-picker/geo-picker.component';
import { SessionUser } from '../../models/session.model';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';
import { toApiError } from '../../utils/api-error';
import { LINE_ID_PATTERN, normalisePhone, thaiPhone } from './profile-validators';

/** Basic shop details. Shop photo and verification documents are added in Phase 2. */
@Component({
  selector: 'app-shop-profile-form',
  templateUrl: 'shop-profile-form.component.html',
  styleUrls: ['profile-form.scss'],
  imports: [ReactiveFormsModule, IonButton, IonIcon, IonInput, IonNote, IonSpinner, IonTextarea],
})
export class ShopProfileFormComponent {
  private readonly auth = inject(AuthService);
  private readonly modals = inject(ModalController);
  readonly geo = inject(GeoService);

  readonly saved = output<SessionUser>();

  readonly form = inject(FormBuilder).group({
    shopName: ['', [Validators.required, Validators.maxLength(150)]],
    address: ['', [Validators.required, Validators.maxLength(500)]],
    provinceId: [null as number | null, Validators.required],
    districtId: [null as number | null, Validators.required],
    phone: ['', [Validators.required, thaiPhone]],
    lineId: ['', Validators.pattern(LINE_ID_PATTERN)],
    description: ['', Validators.maxLength(2000)],
  });

  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    addIcons({ chevronDown });
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
    if (!provinceId) {
      await this.chooseProvince();
      return;
    }
    const control = this.form.controls.districtId;
    const result = await openGeoPicker(this.modals, {
      mode: 'district',
      provinceId,
      selected: control.value ? [control.value] : [],
    });
    control.markAsTouched();
    if (result) control.setValue(result[0]);
  }

  /** Show the error state on the read-only picker fields like on normal inputs */
  invalid(name: 'provinceId' | 'districtId'): boolean {
    const c = this.form.controls[name];
    return c.invalid && c.touched;
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.error.set('');
    try {
      const v = this.form.getRawValue();
      const user = await this.auth.saveProfile({
        shopName: (v.shopName ?? '').trim(),
        address: (v.address ?? '').trim(),
        provinceId: v.provinceId!,
        districtId: v.districtId!,
        phone: normalisePhone(v.phone ?? ''),
        lineId: (v.lineId ?? '').trim() || undefined,
        description: (v.description ?? '').trim() || undefined,
      });
      this.saved.emit(user);
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
