import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import {
  IonBadge,
  IonButton,
  IonButtons,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonListHeader,
  IonNote,
  IonSearchbar,
  IonTitle,
  IonToolbar,
  ModalController,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { checkmarkCircle, chevronBack, ellipseOutline, globeOutline } from 'ionicons/icons';

import { AreaCounts, AreaSelection } from '../../models/search.model';
import { BANGKOK_ID, District, GeoService, Province } from '../../services/geo.service';
import { searchPlaces } from '../geo-picker/geo-search';

type Step = 'region' | 'province' | 'district';

/**
 * Region -> province -> district picker (Ionic modal).
 * - The search box finds provinces (and districts) from any step and jumps ahead.
 * - District step: "ทั้งจังหวัด" on top, several districts can be chosen; Bangkok says "เขต".
 * - Shows the number of open jobs next to each area when counts are given.
 * Open with openAreaPicker(); resolves with the selection, or undefined when cancelled.
 */
@Component({
  selector: 'app-area-picker',
  templateUrl: 'area-picker.component.html',
  styleUrls: ['area-picker.component.scss'],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonContent,
    IonList,
    IonListHeader,
    IonItem,
    IonLabel,
    IonNote,
    IonBadge,
    IonCheckbox,
    IonFooter,
  ],
})
export class AreaPickerComponent implements OnInit {
  private readonly modal = inject(ModalController);
  readonly geo = inject(GeoService);

  // Set through ModalController componentProps
  @Input() selection: AreaSelection | null = null;
  @Input() counts: AreaCounts | null = null;
  @Input() allowWholeCountry = true;
  @Input() cancelText = 'ยกเลิก';
  @Input() confirmText = 'ดูงานในพื้นที่นี้';

  readonly step = signal<Step>('region');
  readonly regionId = signal<number | null>(null);
  readonly provinceId = signal<number | null>(null);
  readonly picked = signal<Set<number>>(new Set());
  readonly query = signal('');

  readonly regions = computed(() => this.geo.regions());
  readonly provincesOfRegion = computed(() => this.geo.provinces().filter((p) => p.regionId === this.regionId()));
  readonly districts = computed(() => this.geo.districtsOf(this.provinceId()));
  readonly districtUnit = computed(() => this.geo.districtLabel(this.provinceId()));
  readonly regionName = computed(() => this.regions().find((r) => r.id === this.regionId())?.nameTh ?? '');
  readonly provinceName = computed(() => this.geo.provinceName(this.provinceId() ?? 0));

  /** Search across the whole country: matching provinces first, then a few districts */
  readonly results = computed(() => {
    const q = this.query();
    if (!q.trim()) return null;
    const provinces = searchPlaces(this.geo.provinces(), q).slice(0, 15);
    const allDistricts = this.geo.provinces().flatMap((p) => this.geo.districtsOf(p.id));
    const districts = searchPlaces(allDistricts, q).slice(0, 15);
    return { provinces, districts };
  });

  readonly title = computed(() => {
    switch (this.step()) {
      case 'province':
        return this.regionName();
      case 'district':
        return this.provinceName();
      default:
        return 'เลือกพื้นที่';
    }
  });

  constructor() {
    addIcons({ checkmarkCircle, chevronBack, ellipseOutline, globeOutline });
  }

  ngOnInit(): void {
    const s = this.selection;
    if (s?.provinceId) {
      const province = this.geo.provinces().find((p) => p.id === s.provinceId);
      this.regionId.set(province?.regionId ?? null);
      this.provinceId.set(s.provinceId);
      this.picked.set(new Set(s.districtIds));
      this.step.set('district');
    }
  }

  provinceCount(id: number): number {
    return this.counts?.provinces[id] ?? 0;
  }

  districtCount(id: number): number {
    return this.counts?.districts[id] ?? 0;
  }

  regionCount(regionId: number): number {
    return this.geo
      .provinces()
      .filter((p) => p.regionId === regionId)
      .reduce((sum, p) => sum + this.provinceCount(p.id), 0);
  }

  districtPrefix(provinceId: number): string {
    return provinceId === BANGKOK_ID ? 'เขต' : 'อ.';
  }

  openRegion(id: number): void {
    this.regionId.set(id);
    this.step.set('province');
  }

  openProvince(province: Province, preselect: number[] = []): void {
    this.regionId.set(province.regionId);
    if (province.id !== this.provinceId()) this.picked.set(new Set());
    this.provinceId.set(province.id);
    if (preselect.length) this.picked.set(new Set(preselect));
    this.query.set('');
    this.step.set('district');
  }

  openDistrictResult(d: District): void {
    const province = this.geo.provinces().find((p) => p.id === d.provinceId);
    if (province) this.openProvince(province, [d.id]);
  }

  back(): void {
    this.step.set(this.step() === 'district' ? 'province' : 'region');
  }

  toggle(id: number): void {
    this.picked.update((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  wholeProvince(): void {
    this.picked.set(new Set());
  }

  wholeCountry(): void {
    void this.modal.dismiss({ provinceId: null, districtIds: [] } satisfies AreaSelection, 'confirm');
  }

  confirm(): void {
    const districtIds = [...this.picked()];
    void this.modal.dismiss({ provinceId: this.provinceId(), districtIds } satisfies AreaSelection, 'confirm');
  }

  cancel(): void {
    void this.modal.dismiss(null, 'cancel');
  }
}

export interface AreaPickerOptions {
  selection?: AreaSelection | null;
  counts?: AreaCounts | null;
  allowWholeCountry?: boolean;
  cancelText?: string;
  confirmText?: string;
}

/** Resolves with the chosen area, or undefined when the user cancelled / skipped. */
export async function openAreaPicker(modals: ModalController, options: AreaPickerOptions = {}): Promise<AreaSelection | undefined> {
  const modal = await modals.create({
    component: AreaPickerComponent,
    componentProps: { ...options },
  });
  await modal.present();
  const { data, role } = await modal.onWillDismiss<AreaSelection>();
  return role === 'confirm' && data ? data : undefined;
}
