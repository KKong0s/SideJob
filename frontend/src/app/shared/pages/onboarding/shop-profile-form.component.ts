import { Component, OnInit, inject, input, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonIcon, IonInput, IonNote, IonSpinner, IonTextarea, ModalController } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDown } from 'ionicons/icons';

import { openGeoPicker } from '../../components/geo-picker/geo-picker.component';
import { SessionUser, ShopProfileInput } from '../../models/session.model';
import { Shop } from '../../models/shop.model';
import { AuthService } from '../../services/auth.service';
import { GeoService } from '../../services/geo.service';
import { ShopService } from '../../services/shop.service';
import { toApiError } from '../../utils/api-error';
import { normalisePhone, thaiPhone } from './profile-validators';

/**
 * Shop details form.
 * - onboarding mode: saves through the onboarding API and emits the session user (saved)
 * - edit mode: pre-filled from `initial`, saves through /api/shop/profile and emits the shop (updated)
 */
@Component({
  selector: 'app-shop-profile-form',
  templateUrl: 'shop-profile-form.component.html',
  styleUrls: ['profile-form.scss'],
  imports: [ReactiveFormsModule, IonButton, IonIcon, IonInput, IonNote, IonSpinner, IonTextarea],
})
export class ShopProfileFormComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly shops = inject(ShopService);
  private readonly modals = inject(ModalController);
  readonly geo = inject(GeoService);

  readonly mode = input<'onboarding' | 'edit'>('onboarding');
  readonly initial = input<Shop | null>(null);

  readonly saved = output<SessionUser>();
  readonly updated = output<Shop>();

  readonly form = inject(FormBuilder).group({
    shopName: ['', [Validators.required, Validators.maxLength(150)]],
    address: ['', [Validators.required, Validators.maxLength(500)]],
    provinceId: [null as number | null, Validators.required],
    districtId: [null as number | null, Validators.required],
    phone: ['', [Validators.required, thaiPhone]],
    description: ['', Validators.maxLength(2000)],
  });

  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    addIcons({ chevronDown });
  }

  ngOnInit(): void {
    const s = this.initial();
    if (s) {
      this.form.patchValue({
        shopName: s.name,
        address: s.address,
        provinceId: s.provinceId,
        districtId: s.districtId,
        phone: s.phone ?? '',
        description: s.description ?? '',
      });
    }
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
      const input: ShopProfileInput = {
        shopName: (v.shopName ?? '').trim(),
        address: (v.address ?? '').trim(),
        provinceId: v.provinceId!,
        districtId: v.districtId!,
        phone: normalisePhone(v.phone ?? ''),
        description: (v.description ?? '').trim() || undefined,
      };
      if (this.mode() === 'edit') {
        this.updated.emit(await this.shops.updateProfile(input));
      } else {
        this.saved.emit(await this.auth.saveProfile(input));
      }
    } catch (err) {
      this.error.set(toApiError(err).message);
    } finally {
      this.busy.set(false);
    }
  }
}
